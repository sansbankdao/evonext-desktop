// src-tauri/src/social/tests/feed.rs

//! Feed orchestration tests — merge, dedupe-by-$id, truncation, timeline
//! query shape, parent embedding. Single-contract policy: the Yappr
//! contract is the only posts contract (the EvoNext posts contract is
//! retired as of 2026-10-05).

use super::{post_doc, prime_empty_profile, MockBackend};
use crate::dapi::types::Network;
use crate::social::feed::fetch_feed;
use crate::social::profile::ProfileCache;
use crate::social::{
    active_post_contracts, ContentPartType as T, YAPPR_POSTS_CONTRACT_TESTNET,
};

const OWNER_A: &str = "Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1";
const OWNER_B: &str = "Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2";

// ---------------------------------------------------------------------------
// Contract registry
// ---------------------------------------------------------------------------

#[test]
fn active_contracts_testnet_yappr_only_mainnet_none() {
    let testnet = active_post_contracts(Network::Testnet);
    assert_eq!(testnet, vec![YAPPR_POSTS_CONTRACT_TESTNET]);
    // Mainnet has no deployed posts contract.
    assert!(active_post_contracts(Network::Mainnet).is_empty());
}

// ---------------------------------------------------------------------------
// Merge + dedupe + sort
// ---------------------------------------------------------------------------

#[tokio::test]
async fn merges_newest_first_and_truncates() {
    let backend = MockBackend::new();
    backend.ok(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        vec![
            post_doc("p-old", OWNER_A, 1_000, "old"),
            post_doc("p-new", OWNER_A, 4_000, "new"),
            post_doc("p-mid", OWNER_B, 3_000, "mid"),
            post_doc("p-oldest", OWNER_B, 500, "oldest"),
        ],
    );
    prime_empty_profile(&backend, Network::Testnet);
    prime_empty_profile(&backend, Network::Testnet);

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 3, None)
        .await
        .unwrap();

    let ids: Vec<&str> = page.posts.iter().map(|p| p.id.as_str()).collect();
    assert_eq!(ids, vec!["p-new", "p-mid", "p-old"]);
    assert_eq!(page.fetched_counts[YAPPR_POSTS_CONTRACT_TESTNET], 4);
    assert_eq!(page.posts[1].source, "yappr");
    assert_eq!(page.posts[1].owner_id, OWNER_B);
    assert_eq!(page.next_cursor, None);
}

#[tokio::test]
async fn dedupes_by_id_but_keeps_same_ms_distinct_posts() {
    let backend = MockBackend::new();
    backend.ok(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        vec![
            post_doc("dup-id", OWNER_A, 2_000, "dup"),
            post_doc("same-ms-a", OWNER_A, 1_000, "first"),
            post_doc("same-ms-b", OWNER_A, 1_000, "second"),
            // Same $id appearing twice within the one contract's results
            // (e.g. overlapping pages).
            post_doc("dup-id", OWNER_A, 2_000, "dup echo"),
        ],
    );
    prime_empty_profile(&backend, Network::Testnet);

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 50, None)
        .await
        .unwrap();

    let ids: Vec<&str> = page.posts.iter().map(|p| p.id.as_str()).collect();
    assert_eq!(
        ids,
        vec!["dup-id", "same-ms-a", "same-ms-b"],
        "same owner+timestamp posts by one author MUST both survive"
    );
    assert_eq!(page.duplicate_count, 1, "the echoed $id counts once");
}

#[tokio::test]
async fn timeline_query_uses_language_timeline_index_owner_scope_owner_and_time() {
    let backend = MockBackend::new();
    backend.ok(YAPPR_POSTS_CONTRACT_TESTNET, "post", vec![]);
    backend.ok(YAPPR_POSTS_CONTRACT_TESTNET, "post", vec![]);

    let cache = ProfileCache::new();
    let _ = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();
    let _ = fetch_feed(&backend, &cache, Network::Testnet, 20, Some(OWNER_A))
        .await
        .unwrap();

    let calls = backend.calls.lock().unwrap();
    // Timeline call: languageTimeline index — where
    // [["language","==","en"],["$createdAt",">",0]], orderBy
    // [["language","asc"],["$createdAt","desc"]] (yappr getTimeline
    // parity; probe-verified 2026-09-11 — bare $createdAt orderBy is
    // rejected by DAPI on the current contracts).
    let tl_where = serde_json::json!([["language", "==", "en"], ["$createdAt", ">", 0]]);
    let tl_order = serde_json::json!([["language", "asc"], ["$createdAt", "desc"]]);
    assert_eq!(calls[0].2, Some(tl_where.clone()));
    assert_eq!(calls[0].3, Some(tl_order));
    // Owner-scoped call: ownerAndTime index —
    // where [["$ownerId","==",owner],["$createdAt",">",0]], orderBy
    // [["$ownerId","asc"],["$createdAt","desc"]].
    let ow_where = serde_json::json!([["$ownerId", "==", OWNER_A], ["$createdAt", ">", 0]]);
    let ow_order = serde_json::json!([["$ownerId", "asc"], ["$createdAt", "desc"]]);
    assert_eq!(calls[1].2, Some(ow_where.clone()));
    assert_eq!(calls[1].3, Some(ow_order));
}

// ---------------------------------------------------------------------------
// Transport failure — the trigger for the frontend SDK fallback.
// ---------------------------------------------------------------------------

#[tokio::test]
async fn transport_failure_returns_error_not_blank_page() {
    // With a single posts contract, any transport failure IS a total
    // failure: fetch_feed must surface the error (not Ok(empty)) so the
    // frontend can fall back to the direct-SDK transport. A silent
    // Ok(empty) reads as "No posts yet" while the proxy is down — the
    // v26.10.1 field bug.
    let backend = MockBackend::new();
    backend.push(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        Err("proxy unreachable".into()),
    );

    let cache = ProfileCache::new();
    let result = fetch_feed(&backend, &cache, Network::Testnet, 20, None).await;
    let err = result.expect_err("failed fetch must return Err, not Ok(empty)");
    assert!(err.contains("proxy unreachable"), "error carries cause: {err}");
}

#[tokio::test]
async fn empty_timeline_returns_ok_empty_page() {
    // A successful query that simply has no documents is a normal empty
    // feed — NOT an error.
    let backend = MockBackend::new();
    backend.ok(YAPPR_POSTS_CONTRACT_TESTNET, "post", Vec::new());

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();
    assert!(page.posts.is_empty());
    assert_eq!(page.fetched_counts[YAPPR_POSTS_CONTRACT_TESTNET], 0);
}

// ---------------------------------------------------------------------------
// Shaping: content parts + parents
// ---------------------------------------------------------------------------

#[tokio::test]
async fn posts_carry_parsed_content_parts() {
    let backend = MockBackend::new();
    backend.ok(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        vec![post_doc("p1", OWNER_A, 1_000, "gm **Dash** #dash")],
    );
    prime_empty_profile(&backend, Network::Testnet);

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();

    let parts = &page.posts[0].content_parts;
    let types: Vec<T> = parts.iter().map(|p| p.part_type).collect();
    assert_eq!(types, vec![T::Text, T::Bold, T::Text, T::Hashtag]);
}

#[tokio::test]
async fn reply_parent_is_embedded_by_id_lookup() {
    let backend = MockBackend::new();
    // Feed page: a reply referencing a parent not on the page.
    backend.ok(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        vec![serde_json::json!({
            "$id": "child",
            "$ownerId": OWNER_B,
            "$createdAt": 2_000,
            "content": "reply!",
            "replyToPostId": "parent",
        })],
    );
    // Parent lookup (second fetch against the same contract).
    backend.ok(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        vec![post_doc("parent", OWNER_A, 1_000, "parent post")],
    );
    prime_empty_profile(&backend, Network::Testnet); // OWNER_B
    prime_empty_profile(&backend, Network::Testnet); // OWNER_A (parent author)

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();

    let child = &page.posts[0];
    assert_eq!(child.reply_to_post_id.as_deref(), Some("parent"));
    let parent = child.reply_to.as_ref().expect("parent embedded");
    assert_eq!(parent.id, "parent");
    assert_eq!(parent.content, "parent post");
}

#[tokio::test]
async fn parent_lookup_failure_leaves_id_only() {
    let backend = MockBackend::new();
    backend.ok(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        vec![serde_json::json!({
            "$id": "child",
            "$ownerId": OWNER_B,
            "$createdAt": 2_000,
            "content": "reply!",
            "quotedPostId": "ghost",
        })],
    );
    // Parent fetch errors on the contract.
    backend.push(YAPPR_POSTS_CONTRACT_TESTNET, "post", Err("nope".into()));
    prime_empty_profile(&backend, Network::Testnet);

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();

    let child = &page.posts[0];
    assert_eq!(child.quoted_post_id.as_deref(), Some("ghost"));
    assert!(child.quoted_post.is_none());
}
