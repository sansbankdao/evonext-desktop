// src-tauri/src/social/mod.rs

//! Yappr social-feed support (read parity with evonext-mobile / yap.pr).
//!
//! All feed orchestration, author-profile resolution, avatar FIELD parsing,
//! and Phase A rich-text parsing live Rust-side. The only TS island is
//! DiceBear SVG *generation* (@dicebear 9.4.x — the ecosystem's version;
//! Rust dicebear-core 11.0.0-rc renders DIFFERENT artwork for the same
//! style+seed, verified empirically 2026-09-11).
//!
//! Contract/query rules: docs/HANDOFF-yappr-enablement.md (live-verified
//! against dapi.sansbank.dev 2026-09-09).

pub mod avatar;
pub mod backend;
pub mod content;
pub mod feed;
pub mod profile;

#[cfg(test)]
mod tests;

use serde::{Deserialize, Serialize};
use specta::Type;

// -----------------------------------------------------------------------------
// CONTRACT REGISTRY (authoritative — do NOT copy IDs from the upstream yap.pr
// repo; its default EWR695… contract is live but stale and cannot serve
// timeline queries. The ecosystem standard is AyWK6nD…).
// -----------------------------------------------------------------------------

pub const YAPPR_POSTS_CONTRACT_MAINNET: &str = ""; // never deployed
pub const YAPPR_POSTS_CONTRACT_TESTNET: &str = "AyWK6nDVfb8d1ZmkM5MmZZrThbUyWyso1aMeGuuVSfxf";
pub const YAPPR_PROFILE_CONTRACT_MAINNET: &str = ""; // never deployed
pub const YAPPR_PROFILE_CONTRACT_TESTNET: &str = "FZSnZdKsLAuWxE7iZJq12eEz6xfGTgKPxK7uZJapTQxe";
pub const DPNS_CONTRACT_ID: &str = "GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec"; // both networks
pub const DASHPAY_CONTRACT_ID: &str = "Bwr4WHCPz5rFVAD87RqTs3izo4zpzwsEdKPWUT1NS1C7"; // both networks

use crate::dapi::types::Network;

// Re-exported so the social module is self-contained for callers.
pub use crate::constants::{EVONEXT_CONTRACT_ID_MAINNET, EVONEXT_CONTRACT_ID_TESTNET};

/// Yappr posts contract for a network, if one exists.
pub fn yappr_posts_contract(network: Network) -> Option<&'static str> {
    match network {
        Network::Testnet => Some(YAPPR_POSTS_CONTRACT_TESTNET),
        Network::Mainnet => None,
    }
}

/// Yappr unified-profile contract for a network, if one exists.
pub fn yappr_profile_contract(network: Network) -> Option<&'static str> {
    match network {
        Network::Testnet => Some(YAPPR_PROFILE_CONTRACT_TESTNET),
        Network::Mainnet => None,
    }
}

/// Post contracts merged into the social feed (EvoNext always; Yappr when
/// deployed). Mirrors the TS `getActivePostContracts`.
pub fn active_post_contracts(network: Network) -> Vec<&'static str> {
    let mut out = vec![match network {
        Network::Testnet => crate::constants::EVONEXT_CONTRACT_ID_TESTNET,
        Network::Mainnet => crate::constants::EVONEXT_CONTRACT_ID_MAINNET,
    }];
    if let Some(yappr) = yappr_posts_contract(network) {
        out.push(yappr);
    }
    out
}

// -----------------------------------------------------------------------------
// DTOs (cross the command boundary — serde + specta)
// -----------------------------------------------------------------------------

/// Renderable avatar. `Dicebear` is rendered TS-side by the local
/// @dicebear island (byte-parity with yap.pr/mobile); `Uri` goes to <img>.
#[derive(Serialize, Deserialize, Clone, Debug, Type, PartialEq)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum AvatarSource {
    #[serde(rename_all = "camelCase")]
    Dicebear { style: String, seed: String },
    #[serde(rename_all = "camelCase")]
    Uri { uri: String },
}

#[derive(Serialize, Deserialize, Clone, Copy, Debug, Type, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ContentPartType {
    Text,
    Hashtag,
    Cashtag,
    Mention,
    Url,
    Bold,
    Italic,
    Code,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ContentPart {
    #[serde(rename = "type")]
    pub part_type: ContentPartType,
    pub value: String,
    /// Parsed inner content for bold/italic/code segments.
    pub children: Option<Vec<ContentPart>>,
}

/// Fully-resolved post author (Yappr profile → DPNS → DashPay chain).
#[derive(Serialize, Deserialize, Clone, Debug, Type, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AuthorProfile {
    pub identity_id: String,
    /// Yappr displayName → @username → `User <first6 of identityId>`.
    pub display_name: String,
    /// @username → @<first8 of identityId, lowercased>.
    pub username: String,
    /// Existing desktop semantics: checkmark == owns a DPNS name.
    pub verified: bool,
    /// DashPay publicMessage when present ('' otherwise — Yappr profiles
    /// have no bio field).
    pub bio: String,
    pub avatar: AvatarSource,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SocialPost {
    pub id: String,
    pub contract_id: String,
    /// "evonext" | "yappr" — for the source badge.
    pub source: String,
    pub owner_id: String,
    pub author: AuthorProfile,
    pub content: String,
    pub content_parts: Vec<ContentPart>,
    /// Milliseconds epoch (64-bit — see handoff §11).
    pub created_at: u64,
    pub updated_at: u64,
    pub reply_to_post_id: Option<String>,
    pub quoted_post_id: Option<String>,
    pub reply_to: Option<Box<SocialPost>>,
    pub quoted_post: Option<Box<SocialPost>>,
    pub language: String,
    pub sensitive: bool,
    pub media_urls: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SocialFeedPage {
    pub posts: Vec<SocialPost>,
    /// Reserved for future per-contract server cursors (a merged feed has
    /// no single startAfter value; today paging is client-side).
    pub next_cursor: Option<String>,
    /// Per-contract raw document counts (feeds the existing debug panel).
    pub fetched_counts: std::collections::HashMap<String, u32>,
    /// Documents dropped by $id dedupe.
    pub duplicate_count: u32,
}
