// src-tauri/src/social/avatar.rs

//! Yappr profile `avatar` field resolution (port of evonext-mobile
//! `src/helpers/avatar.ts` minus SVG generation, which stays TS-side — see
//! module docs). The field is either:
//!   - a DiceBear JSON string: {"style":"bottts","seed":"xyz"}
//!   - a direct image URI: http(s)://… or ipfs://…
//!
//! Priority (Yappr's resolve-user-details): Yappr `avatar` field →
//! DashPay `avatarUrl` → deterministic DiceBear `thumbs` seeded by the
//! identity ID. Unknown DiceBear styles fall back to `thumbs` at
//! generation time (TS island), matching Yappr.

use super::AvatarSource;

/// Default style for identity-seeded fallback avatars (Yappr uses thumbs).
pub const DEFAULT_STYLE: &str = "thumbs";

/// IPFS gateway for ipfs:// avatar URIs (same default as Yappr).
pub const IPFS_GATEWAY: &str = "https://ipfs.io/ipfs/";

/// Convert an ipfs:// URI to an HTTP gateway URL. Other URIs pass through.
pub fn ipfs_to_gateway(uri: &str) -> String {
    if !uri.starts_with("ipfs://") {
        return uri.to_string();
    }
    let cid_path = uri
        .trim_start_matches("ipfs://")
        .trim_start_matches("ipfs/");
    format!("{IPFS_GATEWAY}{cid_path}")
}

fn is_image_uri(field: &str) -> bool {
    field.starts_with("http://") || field.starts_with("https://") || field.starts_with("ipfs://")
}

/// Parse a Yappr profile `avatar` field into a renderable source.
/// Falls back to a deterministic DiceBear avatar seeded by the identity ID
/// when the field is missing or malformed (Yappr behavior).
pub fn parse_avatar_field(avatar_field: Option<&str>, identity_id: &str) -> AvatarSource {
    if let Some(field) = avatar_field.filter(|f| !f.is_empty()) {
        if is_image_uri(field) {
            return AvatarSource::Uri {
                uri: ipfs_to_gateway(field),
            };
        }
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(field) {
            if let Some(seed) = config.get("seed").and_then(|v| v.as_str()) {
                let style = config
                    .get("style")
                    .and_then(|v| v.as_str())
                    .unwrap_or(DEFAULT_STYLE);
                return AvatarSource::Dicebear {
                    style: style.to_string(),
                    seed: seed.to_string(),
                };
            }
        }
    }
    AvatarSource::Dicebear {
        style: DEFAULT_STYLE.to_string(),
        seed: identity_id.to_string(),
    }
}

/// Resolve the best avatar for a post author.
/// Priority: Yappr profile avatar field → legacy DashPay avatarUrl →
/// deterministic DiceBear from identity ID.
pub fn resolve_author_avatar(
    yappr_avatar_field: Option<&str>,
    dashpay_avatar_url: Option<&str>,
    identity_id: &str,
) -> AvatarSource {
    if let Some(field) = yappr_avatar_field.filter(|f| !f.is_empty()) {
        return parse_avatar_field(Some(field), identity_id);
    }
    if let Some(url) = dashpay_avatar_url.filter(|f| !f.is_empty()) {
        return AvatarSource::Uri {
            uri: ipfs_to_gateway(url),
        };
    }
    parse_avatar_field(None, identity_id)
}
