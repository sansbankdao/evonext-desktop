// src-tauri/src/social/feed.rs

//! Social-feed orchestration (replaces the TS-side merge in
//! `stores/posts/actions/fetch.ts`):
//!   1. fetch `post` documents from every active contract (timeline =
//!      yappr `getTimeline` parity: languageTimeline index, `language ==
//!      'en' AND $createdAt > 0`, orderBy language asc + $createdAt desc —
//!      probe-verified 2026-09-11; a bare $createdAt orderBy matches NO
//!      index on the v10 contract and is rejected by DAPI);
//!   2. merge, dedupe by $id (NOT ownerId+createdAt — same-ms posts by one
//!      author must survive), sort newest-first, truncate to limit;
//!   3. resolve every author via the cached three-tier chain;
//!   4. parse Phase A rich text;
//!   5. embed reply/quote parents (fetched by $id across active contracts).
//!
//! Networks without a Yappr contract degrade gracefully to EvoNext-only.

use super::backend::DocumentBackend;
use super::content::parse_post_content;
use super::profile::{resolve_author, ProfileCache};
use super::{active_post_contracts, AuthorProfile, SocialFeedPage, SocialPost};
use super::{YAPPR_POSTS_CONTRACT_MAINNET, YAPPR_POSTS_CONTRACT_TESTNET};
use crate::dapi::types::Network;
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};

/// Per-contract fetch size (merged feed is truncated client-side).
const FETCH_MULTIPLIER: u32 = 2;

/// Timeline language filter — yappr `getTimeline` default parity
/// (`lib/services/post-service.ts` on upstream master).
const TIMELINE_LANGUAGE: &str = "en";

fn doc_str<'a>(doc: &'a Value, name: &str) -> Option<&'a str> {
    doc.get(name).and_then(|v| v.as_str())
}

/// $createdAt/$updatedAt are ms epoch u64; tolerate string-typed values.
fn doc_timestamp(doc: &Value, name: &str) -> u64 {
    doc.get(name)
        .and_then(|v| {
            v.as_u64()
                .or_else(|| v.as_str().and_then(|s| s.parse::<u64>().ok()))
        })
        .unwrap_or(0)
}

fn doc_id(doc: &Value) -> String {
    doc_str(doc, "$id")
        .or_else(|| doc_str(doc, "id"))
        .unwrap_or("")
        .to_string()
}

fn doc_owner(doc: &Value) -> String {
    doc_str(doc, "$ownerId")
        .or_else(|| doc_str(doc, "ownerId"))
        .unwrap_or("")
        .to_string()
}

fn source_for(contract_id: &str) -> &'static str {
    if contract_id == YAPPR_POSTS_CONTRACT_TESTNET || contract_id == YAPPR_POSTS_CONTRACT_MAINNET {
        "yappr"
    } else {
        "evonext"
    }
}

fn shape_post(
    doc: &Value,
    contract_id: &str,
    author: AuthorProfile,
    parents: &HashMap<String, SocialPost>,
) -> SocialPost {
    let reply_to_post_id = doc_str(doc, "replyToPostId").map(|s| s.to_string());
    let quoted_post_id = doc_str(doc, "quotedPostId").map(|s| s.to_string());
    let media_urls = doc
        .get("mediaUrls")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|m| m.as_str().map(|s| s.to_string()))
                .collect()
        })
        .or_else(|| doc_str(doc, "mediaUrl").map(|u| vec![u.to_string()]))
        .unwrap_or_default();
    let content = doc_str(doc, "content").unwrap_or("").to_string();

    SocialPost {
        id: doc_id(doc),
        contract_id: contract_id.to_string(),
        source: source_for(contract_id).to_string(),
        owner_id: doc_owner(doc),
        author,
        content_parts: parse_post_content(&content),
        content,
        created_at: doc_timestamp(doc, "$createdAt"),
        updated_at: doc_timestamp(doc, "$updatedAt"),
        reply_to: reply_to_post_id
            .as_ref()
            .and_then(|id| parents.get(id))
            .cloned()
            .map(Box::new),
        quoted_post: quoted_post_id
            .as_ref()
            .and_then(|id| parents.get(id))
            .cloned()
            .map(Box::new),
        reply_to_post_id,
        quoted_post_id,
        language: doc_str(doc, "language").unwrap_or("en").to_string(),
        sensitive: doc
            .get("sensitive")
            .or_else(|| doc.get("isSensitive"))
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        media_urls,
    }
}

/// Fetch + merge + shape the social feed. Per-contract failures are logged
/// and tolerated (a dead contract must not blank the whole feed).
pub async fn fetch_feed<B: DocumentBackend + Sync>(
    backend: &B,
    cache: &ProfileCache,
    network: Network,
    limit: u32,
    owner_id: Option<&str>,
) -> Result<SocialFeedPage, String> {
    let contracts = active_post_contracts(network);
    if contracts.is_empty() {
        return Ok(SocialFeedPage {
            posts: Vec::new(),
            next_cursor: None,
            fetched_counts: HashMap::new(),
            duplicate_count: 0,
        });
    }
    let limit = limit.max(1);

    // 1) Fetch every contract. Timeline uses the languageTimeline index
    //    (yappr getTimeline parity, probe-verified 2026-09-11); owner scope
    //    uses ownerAndTime. A bare $createdAt orderBy matches NO index on
    //    the current contracts and is rejected by DAPI (handoff §5.1 was
    //    written against the stale AyWK6nD… generation — do not restore it).
    let mut fetched_counts = HashMap::new();
    let mut raw: Vec<(Value, &str)> = Vec::new();
    for contract in &contracts {
        let (where_clause, order_by) = match owner_id {
            Some(id) => (
                json!([["$ownerId", "==", id], ["$createdAt", ">", 0]]),
                json!([["$ownerId", "asc"], ["$createdAt", "desc"]]),
            ),
            None => (
                json!([
                    ["language", "==", TIMELINE_LANGUAGE],
                    ["$createdAt", ">", 0]
                ]),
                json!([["language", "asc"], ["$createdAt", "desc"]]),
            ),
        };
        match backend
            .get_documents(
                contract,
                "post",
                network,
                Some(where_clause),
                Some(order_by),
                Some(limit * FETCH_MULTIPLIER),
                None,
            )
            .await
        {
            Ok(docs) => {
                fetched_counts.insert(contract.to_string(), docs.len() as u32);
                raw.extend(docs.into_iter().map(|d| (d, *contract)));
            }
            Err(e) => {
                eprintln!("[social] fetch failed for contract {contract}: {e}");
                fetched_counts.insert(contract.to_string(), 0);
            }
        }
    }

    // 2) Merge: dedupe by $id, newest first, truncate.
    let fetched_total = raw.len();
    let mut seen = HashSet::new();
    let mut merged: Vec<(Value, &str)> = Vec::new();
    // Sort BEFORE dedupe so the surviving copy is deterministic.
    raw.sort_by_key(|(doc, _)| std::cmp::Reverse(doc_timestamp(doc, "$createdAt")));
    for (doc, contract) in raw {
        if seen.insert(doc_id(&doc)) {
            merged.push((doc, contract));
        }
    }
    let duplicate_count = (fetched_total - merged.len()) as u32;
    merged.truncate(limit as usize);

    // 3) Resolve authors (cached; concurrent across unique owners).
    let owner_ids: Vec<String> = {
        let mut ids: Vec<String> = merged
            .iter()
            .map(|(doc, _)| doc_owner(doc))
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();
        ids.sort();
        ids
    };
    let resolutions = futures::future::join_all(owner_ids.iter().map(|id| async move {
        (
            id.clone(),
            resolve_author(backend, cache, network, id).await,
        )
    }))
    .await;
    let authors: HashMap<String, AuthorProfile> = resolutions.into_iter().collect();

    // 4) Shape page posts.
    let mut posts: Vec<SocialPost> = merged
        .iter()
        .map(|(doc, contract)| {
            let author = authors
                .get(&doc_owner(doc))
                .cloned()
                .unwrap_or_else(|| super::profile::anonymous_author(&doc_owner(doc)));
            shape_post(doc, contract, author, &HashMap::new())
        })
        .collect();

    // 5) Embed reply/quote parents not already present in the page.
    let present: HashSet<String> = posts.iter().map(|p| p.id.clone()).collect();
    let wanted: HashSet<String> = posts
        .iter()
        .flat_map(|p| {
            [p.reply_to_post_id.clone(), p.quoted_post_id.clone()]
                .into_iter()
                .flatten()
        })
        .filter(|id| !id.is_empty() && !present.contains(id))
        .collect();
    let mut parents: HashMap<String, SocialPost> = HashMap::new();
    if !wanted.is_empty() {
        let ids: Vec<String> = wanted.into_iter().collect();
        for contract in &contracts {
            match backend
                .get_documents(
                    contract,
                    "post",
                    network,
                    Some(json!([["$id", "in", ids]])),
                    None,
                    Some(ids.len() as u32),
                    None,
                )
                .await
            {
                Ok(docs) => {
                    for doc in docs {
                        let id = doc_id(&doc);
                        if parents.contains_key(&id) {
                            continue;
                        }
                        let owner = doc_owner(&doc);
                        let author = match authors.get(&owner) {
                            Some(a) => a.clone(),
                            None => resolve_author(backend, cache, network, &owner).await,
                        };
                        parents.insert(id, shape_post(&doc, contract, author, &HashMap::new()));
                    }
                }
                Err(e) => eprintln!("[social] parent fetch failed for {contract}: {e}"),
            }
        }
        for post in &mut posts {
            if post.reply_to.is_none() {
                if let Some(id) = &post.reply_to_post_id {
                    post.reply_to = parents.get(id).cloned().map(Box::new);
                }
            }
            if post.quoted_post.is_none() {
                if let Some(id) = &post.quoted_post_id {
                    post.quoted_post = parents.get(id).cloned().map(Box::new);
                }
            }
        }
    }

    Ok(SocialFeedPage {
        posts,
        next_cursor: None,
        fetched_counts,
        duplicate_count,
    })
}
