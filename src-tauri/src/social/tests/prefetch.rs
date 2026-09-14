// src-tauri/src/social/tests/prefetch.rs

//! Fallback-transport tests: `PrefetchedBackend` must serve the SAME feed
//! pipeline from a TS-prefetched bundle (proxy outage → direct JS-SDK
//! transport), degrade gracefully on bundle misses, and never fabricate
//! documents for where-clauses it does not understand.

use super::{dpns_domain_doc, post_doc, yappr_profile_doc};
use crate::dapi::types::Network;
use crate::social::feed::fetch_feed;
use crate::social::prefetch::{apply_where, PrefetchedBackend, SocialFetchBundle};
use crate::social::profile::ProfileCache;
use crate::social::{EVONEXT_CONTRACT_ID_TESTNET, YAPPR_POSTS_CONTRACT_TESTNET};
use serde_json::{json, Value};
use std::collections::HashMap;

const OWNER_A: &str = "ownerAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const OWNER_B: &str = "ownerBbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

fn bundle(pairs: Vec<(String, Vec<Value>)>) -> SocialFetchBundle {
    let documents: HashMap<String, Vec<Value>> = pairs.into_iter().collect();
    SocialFetchBundle { documents }
}

// ---------------------------------------------------------------------------
// apply_where
// ---------------------------------------------------------------------------

#[test]
fn apply_where_supports_pipeline_shapes() {
    let docs = vec![
        post_doc("p1", OWNER_A, 1_000, "first"),
        post_doc("p2", OWNER_B, 2_000, "second"),
    ];

    // No clause → everything.
    assert_eq!(apply_where(&docs, &None).len(), 2);

    // $ownerId == (profile + owner-scoped post lookups).
    let w = Some(json!([["$ownerId", "==", OWNER_A]]));
    let got = apply_where(&docs, &w);
    assert_eq!(got.len(), 1);
    assert_eq!(got[0]["$id"], "p1");

    // Compound timeline shape: language == en AND $createdAt > 1500.
    let w = Some(json!([["language", "==", "en"], ["$createdAt", ">", 1500]]));
    let got = apply_where(&docs, &w);
    assert_eq!(got.len(), 1);
    assert_eq!(got[0]["$id"], "p2");

    // $id in [...] (parent-post lookups).
    let w = Some(json!([["$id", "in", ["p1", "p2"]]]));
    assert_eq!(apply_where(&docs, &w).len(), 2);
    let w = Some(json!([["$id", "in", ["p2"]]]));
    let got = apply_where(&docs, &w);
    assert_eq!(got.len(), 1);
    assert_eq!(got[0]["$id"], "p2");

    // Dotted path (records.identity).
    let domains = vec![dpns_domain_doc("alice", OWNER_A, false)];
    let w = Some(json!([["records.identity", "==", OWNER_A]]));
    assert_eq!(apply_where(&domains, &w).len(), 1);
    let w = Some(json!([["records.identity", "==", OWNER_B]]));
    assert_eq!(apply_where(&domains, &w).len(), 0);
}

#[test]
fn apply_where_unknown_shape_matches_nothing() {
    let docs = vec![post_doc("p1", OWNER_A, 1_000, "first")];
    // Unknown operator → no fabrication.
    let w = Some(json!([["$ownerId", "startsWith", "owner"]]));
    assert_eq!(apply_where(&docs, &w).len(), 0);
    // Malformed clause (too short) → no fabrication.
    let w = Some(json!([["$ownerId", "=="]]));
    assert_eq!(apply_where(&docs, &w).len(), 0);
    // Missing field → excluded.
    let w = Some(json!([["nonexistent", "==", 1]]));
    assert_eq!(apply_where(&docs, &w).len(), 0);
}

// ---------------------------------------------------------------------------
// PrefetchedBackend over the feed pipeline
// ---------------------------------------------------------------------------

#[tokio::test]
async fn prefetched_backend_serves_full_feed_with_profiles() {
    let posts = vec![
        post_doc("p1", OWNER_A, 1_000, "from evonext"),
        post_doc("p2", OWNER_B, 2_000, "from yappr"),
    ];
    let bundle = bundle(vec![
        (format!("{EVONEXT_CONTRACT_ID_TESTNET}:post"), posts.clone()),
        (format!("{YAPPR_POSTS_CONTRACT_TESTNET}:post"), posts),
        (
            format!("{}:profile", crate::social::YAPPR_PROFILE_CONTRACT_TESTNET),
            vec![yappr_profile_doc(OWNER_A, "Alice", None)],
        ),
        (
            format!("{}:domain", crate::social::DPNS_CONTRACT_ID),
            vec![dpns_domain_doc("bob", OWNER_B, false)],
        ),
        // DashPay tier absent from the bundle → TierResult failure →
        // resolver falls back without caching (never poisons).
    ]);

    let backend = PrefetchedBackend::new(bundle);
    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();

    assert_eq!(page.posts.len(), 2, "merged across both contracts");
    assert_eq!(
        page.fetched_counts.get(EVONEXT_CONTRACT_ID_TESTNET),
        Some(&2)
    );
    assert_eq!(
        page.fetched_counts.get(YAPPR_POSTS_CONTRACT_TESTNET),
        Some(&2)
    );
    let alice = page
        .posts
        .iter()
        .find(|p| p.owner_id == OWNER_A)
        .expect("owner A post");
    assert_eq!(alice.author.display_name, "Alice");
    let bob = page
        .posts
        .iter()
        .find(|p| p.owner_id == OWNER_B)
        .expect("owner B post");
    assert_eq!(bob.author.username, "@bob");
    assert!(bob.author.verified, "DPNS name → verified badge");
}

#[tokio::test]
async fn prefetched_backend_missing_post_contract_degrades_to_empty_tier() {
    // Only ONE contract bundled → the other reports a transport miss;
    // fetch_feed keeps the contract in fetchedContracts with zero docs
    // (same semantics as a DAPI error on the primary path).
    let bundle = bundle(vec![(
        format!("{EVONEXT_CONTRACT_ID_TESTNET}:post"),
        vec![post_doc("p1", OWNER_A, 1_000, "hello")],
    )]);
    let backend = PrefetchedBackend::new(bundle);
    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 20, None)
        .await
        .unwrap();

    assert_eq!(page.posts.len(), 1);
    assert_eq!(page.fetched_counts.len(), 2);
    assert_eq!(
        page.fetched_counts.get(YAPPR_POSTS_CONTRACT_TESTNET),
        Some(&0),
        "missing bundle tier degrades to a zero-doc contract, not an error"
    );
    assert_eq!(page.posts[0].author.identity_id, OWNER_A);
    // Author unresolved (no profile tiers bundled) → anonymous fallback.
    assert_eq!(
        page.posts[0].author.display_name,
        format!("User {}", &OWNER_A[..6])
    );
}

#[tokio::test]
async fn prefetched_backend_owner_scoped_feed_filters() {
    let posts = vec![
        post_doc("p1", OWNER_A, 1_000, "mine"),
        post_doc("p2", OWNER_B, 2_000, "not mine"),
    ];
    let bundle = bundle(vec![
        (format!("{EVONEXT_CONTRACT_ID_TESTNET}:post"), posts.clone()),
        (format!("{YAPPR_POSTS_CONTRACT_TESTNET}:post"), posts),
    ]);
    let backend = PrefetchedBackend::new(bundle);
    let cache = ProfileCache::new();
    let page = fetch_feed(&backend, &cache, Network::Testnet, 20, Some(OWNER_A))
        .await
        .unwrap();

    assert_eq!(page.posts.len(), 1);
    assert_eq!(page.posts[0].owner_id, OWNER_A);
}

#[tokio::test]
async fn prefetched_backend_ignores_malformed_bundle_keys() {
    use crate::social::backend::DocumentBackend;
    let bundle = bundle(vec![
        ("no-colon-separator".to_string(), vec![json!({"$id": "x"})]),
        (
            format!("{EVONEXT_CONTRACT_ID_TESTNET}:post"),
            vec![post_doc("p1", OWNER_A, 1_000, "hi")],
        ),
    ]);
    let backend = PrefetchedBackend::new(bundle);
    // Malformed key dropped → treated like any other bundle miss (Err).
    let miss = backend
        .get_documents(
            "no-colon-separator",
            "",
            Network::Testnet,
            None,
            None,
            None,
            None,
        )
        .await;
    assert!(miss.is_err());
    // Valid key served.
    let hit = backend
        .get_documents(
            EVONEXT_CONTRACT_ID_TESTNET,
            "post",
            Network::Testnet,
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();
    assert_eq!(hit.len(), 1);
}
