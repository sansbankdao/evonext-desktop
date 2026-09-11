// src-tauri/src/social/tests/feed.rs

//! Feed orchestration tests — merge, dedupe-by-$id, truncation, graceful
//! degradation, timeline-query shape, parent embedding.

use super::{post_doc, prime_empty_profile, MockBackend};
use crate::dapi::types::Network;
use crate::social::feed::fetch_feed;
use crate::social::profile::ProfileCache;
use crate::social::{
    active_post_contracts, ContentPartType as T, EVONEXT_CONTRACT_ID_MAINNET,
    EVONEXT_CONTRACT_ID_TESTNET, YAPPR_POSTS_CONTRACT_TESTNET,
};

const OWNER_A: &str = "Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1Aa1";
const OWNER_B: &str = "Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2Bb2";

// ---------------------------------------------------------------------------
// Contract registry
// ---------------------------------------------------------------------------

#[test]
fn active_contracts_testnet_merges_both_mainnet_evonext_only() {
    let testnet = active_post_contracts(Network::Testnet);
    assert_eq!(
        testnet,
        vec![EVONEXT_CONTRACT_ID_TESTNET, YAPPR_POSTS_CONTRACT_TESTNET]
    );
    let mainnet = active_post_contracts(Network::Mainnet);
    assert_eq!(mainnet, vec![EVONEXT_CONTRACT_ID_MAINNET]);
}

// ---------------------------------------------------------------------------
// Merge + dedupe + sort
// ---------------------------------------------------------------------------

#[tokio::test]
async fn merges_contracts_newest_first_and_truncates() {
    let backend = MockBackend::new();
    backend.ok(
        EVONEXT_CONTRACT_ID_TESTNET,
        "post",
        vec![
            post_doc("evo-old", OWNER_A, 1_000, "old evo"),
            post_doc("evo-new", OWNER_A, 4_000, "new evo"),
        ],
    );
    backend.ok(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        vec![
            post_doc("yap-mid", OWNER_B, 3_000, "mid yap"),
            post_doc("yap-oldest", OWNER_B, 500, "oldest yap"),
        ],
    );
    prime_empty_profile(&backend, Network::Testnet);
    prime_empty_profile(&backend, Network::Testnet);

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 3, None)
        .await
        .unwrap();

    let ids: Vec<&str> = page.posts.iter().map(|p| p.id.as_str()).collect();
    assert_eq!(ids, vec!["evo-new", "yap-mid", "evo-old"]);
    assert_eq!(page.fetched_counts[EVONEXT_CONTRACT_ID_TESTNET], 2);
    assert_eq!(page.fetched_counts[YAPPR_POSTS_CONTRACT_TESTNET], 2);
    assert_eq!(page.posts[1].source, "yappr");
    assert_eq!(page.posts[1].owner_id, OWNER_B);
    assert_eq!(page.next_cursor, None);
}

#[tokio::test]
async fn dedupes_by_id_but_keeps_same_ms_distinct_posts() {
    let backend = MockBackend::new();
    backend.ok(
        EVONEXT_CONTRACT_ID_TESTNET,
        "post",
        vec![
            post_doc("dup-id", OWNER_A, 2_000, "dup evo"),
            post_doc("same-ms-a", OWNER_A, 1_000, "first"),
            post_doc("same-ms-b", OWNER_A, 1_000, "second"),
        ],
    );
    // Same $id echoed by the second contract (cross-contract mirror).
    backend.ok(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        vec![post_doc("dup-id", OWNER_A, 2_000, "dup yap")],
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
    assert_eq!(page.duplicate_count, 1, "the mirrored $id counts once");
}

#[tokio::test]
async fn timeline_query_has_no_where_clause_owner_scope_does() {
    let backend = MockBackend::new();
    backend.ok(EVONEXT_CONTRACT_ID_TESTNET, "post", vec![]);
    backend.ok(YAPPR_POSTS_CONTRACT_TESTNET, "post", vec![]);
    backend.ok(EVONEXT_CONTRACT_ID_TESTNET, "post", vec![]);
    backend.ok(YAPPR_POSTS_CONTRACT_TESTNET, "post", vec![]);

    let cache = ProfileCache::new();
    let _ = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();
    let _ = fetch_feed(&backend, &cache, Network::Testnet, 20, Some(OWNER_A))
        .await
        .unwrap();

    let calls = backend.calls.lock().unwrap();
    // Timeline calls: where MUST be None (handoff §5.1).
    assert!(calls[0].2.is_none());
    assert!(calls[1].2.is_none());
    // Owner-scoped calls: [["$ownerId","==",owner]].
    let expected = serde_json::json!([["$ownerId", "==", OWNER_A]]);
    assert_eq!(calls[2].2, Some(expected.clone()));
    assert_eq!(calls[3].2, Some(expected));
}

// ---------------------------------------------------------------------------
// Degradation
// ---------------------------------------------------------------------------

#[tokio::test]
async fn one_contract_failing_does_not_blank_the_feed() {
    let backend = MockBackend::new();
    backend.push(
        EVONEXT_CONTRACT_ID_TESTNET,
        "post",
        Err("contract down".into()),
    );
    backend.ok(
        YAPPR_POSTS_CONTRACT_TESTNET,
        "post",
        vec![post_doc("y1", OWNER_B, 9_000, "survivor")],
    );
    prime_empty_profile(&backend, Network::Testnet);

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();

    assert_eq!(page.posts.len(), 1);
    assert_eq!(page.posts[0].id, "y1");
    assert_eq!(page.fetched_counts[EVONEXT_CONTRACT_ID_TESTNET], 0);
}

#[tokio::test]
async fn mainnet_feed_never_touches_yappr_contracts() {
    let backend = MockBackend::new();
    backend.ok(
        EVONEXT_CONTRACT_ID_MAINNET,
        "post",
        vec![post_doc("m1", OWNER_A, 5_000, "mainnet hello")],
    );
    prime_empty_profile(&backend, Network::Mainnet);

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Mainnet, 20, None)
        .await
        .unwrap();

    assert_eq!(page.posts.len(), 1);
    assert_eq!(backend.call_count(YAPPR_POSTS_CONTRACT_TESTNET, "post"), 0);
    assert_eq!(
        backend.call_count(YAPPR_POSTS_CONTRACT_TESTNET, "profile"),
        0
    );
}

// ---------------------------------------------------------------------------
// Shaping: content parts + parents
// ---------------------------------------------------------------------------

#[tokio::test]
async fn posts_carry_parsed_content_parts() {
    let backend = MockBackend::new();
    backend.ok(EVONEXT_CONTRACT_ID_TESTNET, "post", vec![]);
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
    backend.ok(EVONEXT_CONTRACT_ID_TESTNET, "post", vec![]);
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
    backend.ok(EVONEXT_CONTRACT_ID_TESTNET, "post", vec![]);
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
    // Parent fetch errors on both contracts.
    backend.push(YAPPR_POSTS_CONTRACT_TESTNET, "post", Err("nope".into()));
    backend.push(EVONEXT_CONTRACT_ID_TESTNET, "post", Err("nope".into()));
    prime_empty_profile(&backend, Network::Testnet);

    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();

    let child = &page.posts[0];
    assert_eq!(child.quoted_post_id.as_deref(), Some("ghost"));
    assert!(child.quoted_post.is_none());
}
