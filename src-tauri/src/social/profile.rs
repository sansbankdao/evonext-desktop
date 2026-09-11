// src-tauri/src/social/profile.rs

//! Author-profile resolution chain (port of evonext-mobile
//! `PostsStore.fetchProfiles` + `UsernameService`):
//!   1. Yappr unified profile (displayName, avatar) — skipped on networks
//!      with no profile contract;
//!   2. DPNS reverse-resolution (username), contested-first;
//!   3. DashPay profile (legacy fallback; defensive lowercase variants).
//!
//! Failures are logged, never block rendering, and are NEVER cached
//! (transient errors must not stick). Positive results cache 5 min,
//! negative results ("no profile anywhere") 1 min — null is a cached
//! negative, preventing re-fetch storms on every scroll.

use super::avatar::resolve_author_avatar;
use super::backend::DocumentBackend;
use super::{yappr_profile_contract, AuthorProfile, DASHPAY_CONTRACT_ID, DPNS_CONTRACT_ID};
use crate::dapi::types::Network;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

const POSITIVE_TTL: Duration = Duration::from_secs(300);
const NEGATIVE_TTL: Duration = Duration::from_secs(60);

struct CacheEntry {
    /// None == cached negative (author has no resolvable profile).
    value: Option<AuthorProfile>,
    expires_at: Instant,
}

/// In-memory author-profile cache. Interior mutability; never held across
/// an await point.
pub struct ProfileCache {
    entries: Mutex<HashMap<String, CacheEntry>>,
    positive_ttl: Duration,
    negative_ttl: Duration,
}

impl Default for ProfileCache {
    fn default() -> Self {
        Self::new()
    }
}

impl ProfileCache {
    pub fn new() -> Self {
        Self::with_ttls(POSITIVE_TTL, NEGATIVE_TTL)
    }

    pub fn with_ttls(positive_ttl: Duration, negative_ttl: Duration) -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
            positive_ttl,
            negative_ttl,
        }
    }

    fn key(network: Network, owner_id: &str) -> String {
        format!("{}:{}", network.as_str(), owner_id)
    }

    /// Some(Some(profile)) = cached hit; Some(None) = cached negative;
    /// None = miss/expired.
    pub fn get(&self, network: Network, owner_id: &str) -> Option<Option<AuthorProfile>> {
        let map = self.entries.lock().unwrap_or_else(|p| p.into_inner());
        let entry = map.get(&Self::key(network, owner_id))?;
        if Instant::now() > entry.expires_at {
            return None;
        }
        Some(entry.value.clone())
    }

    pub fn put(&self, network: Network, owner_id: &str, value: Option<AuthorProfile>) {
        let ttl = if value.is_some() {
            self.positive_ttl
        } else {
            self.negative_ttl
        };
        let mut map = self.entries.lock().unwrap_or_else(|p| p.into_inner());
        map.insert(
            Self::key(network, owner_id),
            CacheEntry {
                value,
                expires_at: Instant::now() + ttl,
            },
        );
    }
}

// -----------------------------------------------------------------------------
// Document field helpers
// -----------------------------------------------------------------------------

/// Read a camelCase field, tolerating the all-lowercase variant found in
/// older DashPay documents.
fn field<'a>(doc: &'a Value, name: &str) -> Option<&'a Value> {
    doc.get(name).or_else(|| doc.get(name.to_lowercase()))
}

fn field_str<'a>(doc: &'a Value, name: &str) -> Option<&'a str> {
    field(doc, name).and_then(|v| v.as_str())
}

/// Contested-first sort (port of Yappr's `sortUsernamesByContested`):
/// documents carrying `records.dashUniqueIdentityId` sort before aliases.
pub fn sort_domains_contested_first(docs: &mut [Value]) {
    docs.sort_by_key(|doc| {
        let contested = doc
            .get("records")
            .and_then(|r| r.get("dashUniqueIdentityId"))
            .and_then(|v| v.as_str())
            .is_some_and(|s| !s.is_empty());
        if contested {
            0
        } else {
            1
        }
    });
}

// -----------------------------------------------------------------------------
// Individual lookups (failure-tolerant)
// -----------------------------------------------------------------------------

/// Tier outcome: Ok(None) = tier answered, no document (cacheable negative);
/// Err = transport failure (NOT cacheable — handoff §7.3).
type TierResult<T> = Result<Option<T>, String>;

async fn fetch_yappr_profile<B: DocumentBackend + Sync>(
    backend: &B,
    network: Network,
    owner_id: &str,
) -> TierResult<Value> {
    let Some(contract) = yappr_profile_contract(network) else {
        return Ok(None); // no contract on this network → tier answered-empty
    };
    backend
        .get_documents(
            contract,
            "profile",
            network,
            Some(json!([["$ownerId", "==", owner_id]])),
            None, // orderBy omitted — tolerated either way (handoff §5.4)
            Some(1),
            None,
        )
        .await
        .map(|docs| docs.into_iter().next())
        .map_err(|e| {
            eprintln!("[social] yappr profile lookup failed for {owner_id}: {e}");
            e
        })
}

async fn fetch_dpns_name<B: DocumentBackend + Sync>(
    backend: &B,
    network: Network,
    owner_id: &str,
) -> TierResult<String> {
    let mut docs = backend
        .get_documents(
            DPNS_CONTRACT_ID,
            "domain",
            network,
            Some(json!([["records.identity", "==", owner_id]])),
            None, // orderBy MUST be omitted — no sortable index (handoff §5.6)
            Some(10),
            None,
        )
        .await
        .map_err(|e| {
            eprintln!("[social] dpns lookup failed for {owner_id}: {e}");
            e
        })?;
    sort_domains_contested_first(&mut docs);
    let Some(doc) = docs.into_iter().next() else {
        return Ok(None);
    };
    // DAPI flattens to `label`; other tiers may nest under `$label`.
    Ok(doc
        .get("label")
        .or_else(|| doc.get("$label"))
        .or_else(|| doc.get("normalizedLabel"))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string()))
}

async fn fetch_dashpay_profile<B: DocumentBackend + Sync>(
    backend: &B,
    network: Network,
    owner_id: &str,
) -> TierResult<Value> {
    backend
        .get_documents(
            DASHPAY_CONTRACT_ID,
            "profile",
            network,
            Some(json!([["$ownerId", "==", owner_id]])),
            Some(json!([["$updatedAt", "desc"]])),
            Some(1),
            None,
        )
        .await
        .map(|docs| docs.into_iter().next())
        .map_err(|e| {
            eprintln!("[social] dashpay profile lookup failed for {owner_id}: {e}");
            e
        })
}

// -----------------------------------------------------------------------------
// Resolution
// -----------------------------------------------------------------------------

/// Resolve an author profile. NEVER fails: on total absence of profiles the
/// fallbacks produce a deterministic anonymous identity.
pub async fn resolve_author<B: DocumentBackend + Sync>(
    backend: &B,
    cache: &ProfileCache,
    network: Network,
    owner_id: &str,
) -> AuthorProfile {
    if let Some(cached) = cache.get(network, owner_id) {
        if let Some(profile) = cached {
            return profile;
        }
        return anonymous_author(owner_id);
    }

    // Cache ONLY answered results (positive or negative). When every
    // tier failed at the transport level we must not cache — a transient
    // outage must not stick (handoff §7.3); the anonymous fallback is
    // returned uncached and the next refresh retries.
    match resolve_author_uncached(backend, network, owner_id).await {
        Ok(profile) => {
            cache.put(network, owner_id, profile.clone());
            profile.unwrap_or_else(|| anonymous_author(owner_id))
        }
        Err(()) => anonymous_author(owner_id),
    }
}

/// Err(()) = ALL tiers failed at the transport level (do not cache).
/// Ok(None) = at least one tier answered but no profile exists anywhere
/// (cacheable negative). Ok(Some) = resolved.
async fn resolve_author_uncached<B: DocumentBackend + Sync>(
    backend: &B,
    network: Network,
    owner_id: &str,
) -> Result<Option<AuthorProfile>, ()> {
    let yappr = fetch_yappr_profile(backend, network, owner_id).await;
    let dpns_name = fetch_dpns_name(backend, network, owner_id).await;
    let dashpay = fetch_dashpay_profile(backend, network, owner_id).await;

    if yappr.is_err() && dpns_name.is_err() && dashpay.is_err() {
        return Err(()); // total outage
    }
    let yappr = yappr.ok().flatten();
    let dpns_name = dpns_name.ok().flatten();
    let dashpay = dashpay.ok().flatten();

    let answered = yappr.is_some() || dpns_name.is_some() || dashpay.is_some();
    if !answered {
        return Ok(None); // cacheable negative
    }

    let yappr_name = yappr.as_ref().and_then(|d| field_str(d, "displayName"));
    let dashpay_name = dashpay.as_ref().and_then(|d| field_str(d, "displayName"));
    let dashpay_avatar = dashpay.as_ref().and_then(|d| field_str(d, "avatarUrl"));
    let bio = dashpay
        .as_ref()
        .and_then(|d| field_str(d, "publicMessage"))
        .unwrap_or("");

    // Display priority (Yappr's resolve-user-details):
    //   Yappr displayName → @username → User <first6>.
    // (DashPay displayName intentionally NOT preferred over Yappr's —
    // handoff §6 minor issue.)
    let display_name = yappr_name
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
        .or_else(|| dpns_name.as_ref().map(|n| format!("@{n}")))
        .or_else(|| {
            dashpay_name
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| format!("User {}", &owner_id[..owner_id.len().min(6)]));

    let username = dpns_name
        .as_ref()
        .map(|n| format!("@{n}"))
        .unwrap_or_else(|| format!("@{}", &owner_id[..owner_id.len().min(8)].to_lowercase()));

    let avatar = resolve_author_avatar(
        yappr.as_ref().and_then(|d| field_str(d, "avatar")),
        dashpay_avatar,
        owner_id,
    );

    Ok(Some(AuthorProfile {
        identity_id: owner_id.to_string(),
        display_name,
        username,
        verified: dpns_name.is_some(),
        bio: bio.to_string(),
        avatar,
    }))
}

/// Deterministic anonymous identity for authors with no resolvable
/// profile (also the defensive last resort for the feed shaper).
pub fn anonymous_author(owner_id: &str) -> AuthorProfile {
    AuthorProfile {
        identity_id: owner_id.to_string(),
        display_name: format!("User {}", &owner_id[..owner_id.len().min(6)]),
        username: format!("@{}", &owner_id[..owner_id.len().min(8)].to_lowercase()),
        verified: false,
        bio: String::new(),
        avatar: resolve_author_avatar(None, None, owner_id),
    }
}
