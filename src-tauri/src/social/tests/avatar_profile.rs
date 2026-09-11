// src-tauri/src/social/tests/avatar_profile.rs

//! Avatar field resolution + author-profile chain tests.

use super::{
    dashpay_profile_doc, dpns_domain_doc, prime_empty_profile, yappr_profile_doc, MockBackend,
};
use crate::dapi::types::Network;
use crate::social::avatar::{ipfs_to_gateway, parse_avatar_field, resolve_author_avatar};
use crate::social::profile::{resolve_author, sort_domains_contested_first, ProfileCache};
use crate::social::{AvatarSource, DASHPAY_CONTRACT_ID, DPNS_CONTRACT_ID};
use crate::social::{YAPPR_POSTS_CONTRACT_TESTNET, YAPPR_PROFILE_CONTRACT_TESTNET};

const OWNER: &str = "H4x9F2kLmNpQrStUvWxYzAbCdEfGhJ";

// ---------------------------------------------------------------------------
// avatar.rs
// ---------------------------------------------------------------------------

#[test]
fn parses_dicebear_json() {
    let src = parse_avatar_field(Some(r#"{"style":"bottts","seed":"xyz"}"#), OWNER);
    assert_eq!(
        src,
        AvatarSource::Dicebear {
            style: "bottts".into(),
            seed: "xyz".into()
        }
    );
}

#[test]
fn dicebear_json_without_style_defaults_to_thumbs() {
    let src = parse_avatar_field(Some(r#"{"seed":"xyz"}"#), OWNER);
    assert_eq!(
        src,
        AvatarSource::Dicebear {
            style: "thumbs".into(),
            seed: "xyz".into()
        }
    );
}

#[test]
fn http_uri_passthrough() {
    let src = parse_avatar_field(Some("https://example.com/a.png"), OWNER);
    assert_eq!(
        src,
        AvatarSource::Uri {
            uri: "https://example.com/a.png".into()
        }
    );
}

#[test]
fn ipfs_uri_uses_gateway() {
    assert_eq!(
        ipfs_to_gateway("ipfs://QmXyZ"),
        "https://ipfs.io/ipfs/QmXyZ"
    );
    assert_eq!(
        ipfs_to_gateway("ipfs://ipfs/QmXyZ"),
        "https://ipfs.io/ipfs/QmXyZ"
    );
    assert_eq!(ipfs_to_gateway("https://x.io/a"), "https://x.io/a");
    let src = parse_avatar_field(Some("ipfs://QmXyZ"), OWNER);
    assert_eq!(
        src,
        AvatarSource::Uri {
            uri: "https://ipfs.io/ipfs/QmXyZ".into()
        }
    );
}

#[test]
fn malformed_field_falls_back_to_identity_seeded_thumbs() {
    let src = parse_avatar_field(Some("{not json"), OWNER);
    assert_eq!(
        src,
        AvatarSource::Dicebear {
            style: "thumbs".into(),
            seed: OWNER.into()
        }
    );
}

#[test]
fn resolution_priority_yappr_then_dashpay_then_fallback() {
    // Yappr avatar wins over DashPay.
    let src = resolve_author_avatar(
        Some(r#"{"style":"rings","seed":"s"}"#),
        Some("https://x.io/pic.png"),
        OWNER,
    );
    assert!(matches!(src, AvatarSource::Dicebear { .. }));

    // DashPay avatarUrl when no Yappr avatar.
    let src = resolve_author_avatar(None, Some("https://x.io/pic.png"), OWNER);
    assert_eq!(
        src,
        AvatarSource::Uri {
            uri: "https://x.io/pic.png".into()
        }
    );

    // Deterministic identity-seeded thumbs last.
    let src = resolve_author_avatar(None, None, OWNER);
    assert_eq!(
        src,
        AvatarSource::Dicebear {
            style: "thumbs".into(),
            seed: OWNER.into()
        }
    );
}

// ---------------------------------------------------------------------------
// profile.rs — sorting
// ---------------------------------------------------------------------------

#[test]
fn contested_names_sort_before_aliases() {
    let mut docs = vec![
        dpns_domain_doc("aliasname", OWNER, false),
        dpns_domain_doc("contested", OWNER, true),
        dpns_domain_doc("anotheralias", OWNER, false),
    ];
    sort_domains_contested_first(&mut docs);
    assert_eq!(docs[0]["label"], "contested");
}

// ---------------------------------------------------------------------------
// profile.rs — resolution chain (mock backend)
// ---------------------------------------------------------------------------

#[tokio::test]
async fn resolves_full_chain_yappr_displayname_dpns_verified_dashpay_bio() {
    let backend = MockBackend::new();
    backend.ok(
        YAPPR_PROFILE_CONTRACT_TESTNET,
        "profile",
        vec![yappr_profile_doc(
            OWNER,
            "Alice Yappr",
            Some(r#"{"style":"bottts","seed":"a"}"#),
        )],
    );
    backend.ok(
        DPNS_CONTRACT_ID,
        "domain",
        vec![dpns_domain_doc("alice", OWNER, true)],
    );
    backend.ok(
        DASHPAY_CONTRACT_ID,
        "profile",
        vec![dashpay_profile_doc(
            OWNER,
            "Alice DashPay",
            "https://x.io/a.png",
            "hi there",
        )],
    );

    let cache = ProfileCache::new();
    let author = resolve_author(&backend, &cache, Network::Testnet, OWNER).await;

    assert_eq!(author.display_name, "Alice Yappr"); // Yappr beats DashPay
    assert_eq!(author.username, "@alice");
    assert!(author.verified);
    assert_eq!(author.bio, "hi there");
    assert!(matches!(author.avatar, AvatarSource::Dicebear { .. }));

    // BUG 1 regression guard: the Yappr profile lookup MUST hit the
    // profile contract, never the posts contract.
    assert_eq!(
        backend.call_count(YAPPR_PROFILE_CONTRACT_TESTNET, "profile"),
        1
    );
    assert_eq!(
        backend.call_count(YAPPR_POSTS_CONTRACT_TESTNET, "profile"),
        0
    );
}

#[tokio::test]
async fn falls_back_to_at_username_when_no_yappr_name() {
    let backend = MockBackend::new();
    backend.ok(YAPPR_PROFILE_CONTRACT_TESTNET, "profile", vec![]);
    backend.ok(
        DPNS_CONTRACT_ID,
        "domain",
        vec![dpns_domain_doc("bob", OWNER, false)],
    );
    backend.ok(DASHPAY_CONTRACT_ID, "profile", vec![]);

    let cache = ProfileCache::new();
    let author = resolve_author(&backend, &cache, Network::Testnet, OWNER).await;
    assert_eq!(author.display_name, "@bob");
    assert_eq!(author.username, "@bob");
    assert!(author.verified);
}

#[tokio::test]
async fn anonymous_when_nothing_anywhere_and_negative_is_cached() {
    let backend = MockBackend::new();
    prime_empty_profile(&backend, Network::Testnet);
    // No second priming: if the negative were NOT cached, the second
    // resolve would issue fresh calls (recorded) and drain empty queues.

    let cache = ProfileCache::new();
    let first = resolve_author(&backend, &cache, Network::Testnet, OWNER).await;
    assert_eq!(first.display_name, format!("User {}", &OWNER[..6]));
    assert_eq!(first.username, format!("@{}", &OWNER[..8].to_lowercase()));
    assert!(!first.verified);

    let before = backend.calls.lock().unwrap().len();
    let second = resolve_author(&backend, &cache, Network::Testnet, OWNER).await;
    let after = backend.calls.lock().unwrap().len();
    assert_eq!(before, after, "cached negative must not re-fetch");
    assert_eq!(first, second);
}

#[tokio::test]
async fn transport_failures_are_never_cached() {
    let backend = MockBackend::new();
    backend.push(
        YAPPR_PROFILE_CONTRACT_TESTNET,
        "profile",
        Err("boom".into()),
    );
    backend.push(DPNS_CONTRACT_ID, "domain", Err("boom".into()));
    backend.push(DASHPAY_CONTRACT_ID, "profile", Err("boom".into()));
    // Second attempt succeeds.
    backend.ok(
        YAPPR_PROFILE_CONTRACT_TESTNET,
        "profile",
        vec![yappr_profile_doc(OWNER, "Recovered", None)],
    );
    backend.ok(DPNS_CONTRACT_ID, "domain", vec![]);
    backend.ok(DASHPAY_CONTRACT_ID, "profile", vec![]);

    let cache = ProfileCache::new();
    let first = resolve_author(&backend, &cache, Network::Testnet, OWNER).await;
    assert_eq!(first.display_name, format!("User {}", &OWNER[..6])); // anonymous, uncached

    let second = resolve_author(&backend, &cache, Network::Testnet, OWNER).await;
    assert_eq!(
        second.display_name, "Recovered",
        "transient failure must not stick"
    );
}

#[tokio::test]
async fn positive_result_is_cached() {
    let backend = MockBackend::new();
    backend.ok(
        YAPPR_PROFILE_CONTRACT_TESTNET,
        "profile",
        vec![yappr_profile_doc(OWNER, "Cached", None)],
    );
    backend.ok(DPNS_CONTRACT_ID, "domain", vec![]);
    backend.ok(DASHPAY_CONTRACT_ID, "profile", vec![]);

    let cache = ProfileCache::new();
    let _ = resolve_author(&backend, &cache, Network::Testnet, OWNER).await;
    let before = backend.calls.lock().unwrap().len();
    let again = resolve_author(&backend, &cache, Network::Testnet, OWNER).await;
    let after = backend.calls.lock().unwrap().len();
    assert_eq!(before, after);
    assert_eq!(again.display_name, "Cached");
}

#[tokio::test]
async fn dashpay_lowercase_variants_are_tolerated() {
    let backend = MockBackend::new();
    backend.ok(YAPPR_PROFILE_CONTRACT_TESTNET, "profile", vec![]);
    backend.ok(DPNS_CONTRACT_ID, "domain", vec![]);
    backend.ok(
        DASHPAY_CONTRACT_ID,
        "profile",
        vec![serde_json::json!({
            "$ownerId": OWNER,
            "displayname": "Lower Case",
            "avatarurl": "https://x.io/l.png",
            "publicmessage": "lower bio",
        })],
    );

    let cache = ProfileCache::new();
    let author = resolve_author(&backend, &cache, Network::Testnet, OWNER).await;
    assert_eq!(author.display_name, "Lower Case");
    assert_eq!(author.bio, "lower bio");
    assert_eq!(
        author.avatar,
        AvatarSource::Uri {
            uri: "https://x.io/l.png".into()
        }
    );
}

#[tokio::test]
async fn mainnet_skips_the_yappr_tier() {
    let backend = MockBackend::new();
    // No yappr profile contract on mainnet — tier must not even be
    // attempted. DPNS + DashPay exist on both networks.
    backend.ok(DPNS_CONTRACT_ID, "domain", vec![]);
    backend.ok(DASHPAY_CONTRACT_ID, "profile", vec![]);

    let cache = ProfileCache::new();
    let author = resolve_author(&backend, &cache, Network::Mainnet, OWNER).await;
    assert_eq!(author.display_name, format!("User {}", &OWNER[..6]));
    assert_eq!(
        backend.call_count(YAPPR_PROFILE_CONTRACT_TESTNET, "profile"),
        0
    );
}
