// src-tauri/src/commands/social_commands.rs
//
// Typed Tauri command for the merged EvoNext/Yappr social feed. All
// orchestration (multi-contract fetch, dedupe, profile resolution, rich
// content parsing) lives in the Rust `social` module; the frontend only
// renders the returned SocialFeedPage.

use crate::commands::dapi_commands::parse_network;
use crate::dapi::client::{get_dapi_client, DAPIClient};
use crate::social::feed::fetch_feed;
use crate::social::profile::ProfileCache;
use crate::social::SocialFeedPage;
use tauri::State;

/// Managed state holding the process-wide author-profile cache
/// (in-memory, TTL'd — see social::profile).
pub struct SocialService {
    cache: ProfileCache,
}

impl SocialService {
    pub fn new() -> Self {
        Self {
            cache: ProfileCache::new(),
        }
    }
}

impl Default for SocialService {
    fn default() -> Self {
        Self::new()
    }
}

/// Register the social service state. Infallible: the cache is in-memory.
pub fn init_social_state<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    use tauri::Manager;
    app.manage(SocialService::new());
}

/// Fetch the merged social feed for a network.
///
/// * `network`  - "testnet" | "mainnet" (defaults to testnet)
/// * `limit`    - max posts to return after merge/dedupe (default 20)
/// * `owner_id` - optional author filter (uses the ownerAndTime index)
#[tauri::command]
pub async fn fetch_social_feed(
    state: State<'_, SocialService>,
    network: String,
    limit: Option<u32>,
    owner_id: Option<String>,
) -> Result<SocialFeedPage, String> {
    fetch_social_feed_inner(
        get_dapi_client(),
        &state.cache,
        Some(network),
        limit,
        owner_id,
    )
    .await
}

pub(crate) async fn fetch_social_feed_inner(
    client: &DAPIClient,
    cache: &ProfileCache,
    network: Option<String>,
    limit: Option<u32>,
    owner_id: Option<String>,
) -> Result<SocialFeedPage, String> {
    let n = parse_network(network);
    let limit = limit.unwrap_or(20).clamp(1, 100);
    fetch_feed(client, cache, n, limit, owner_id.as_deref()).await
}
