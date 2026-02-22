// src-tauri/src/commands/identity_commands.rs

use crate::cmd_res; // Import the macro from crate root
use crate::dapi::client::get_dapi_client;
use crate::dapi::types::{Identity, Network};
use crate::identity::{lib as identity_logic, storage};
use crate::models::{
    IAnyValue, ICommandResult, IIdentityData, IIdentityPublicKey, IPrivateKeyEntry,
};
use crate::utils::{PersistentStore, StoreManager};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::Runtime;

#[cfg(test)]
mod tests;

pub struct IdentityMapper;

impl IdentityMapper {
    /// Maps a frontend payload to the internal Rust IIdentityData structure.
    /// Ensures that public_key_ids are tracked consistently.
    pub fn map_to_identity(payload: ISaveIdentityPayload) -> IIdentityData {
        let normalized_keys = payload
            .public_keys
            .iter()
            .enumerate()
            .filter_map(|(i, IAnyValue(v))| {
                // The index 'i' acts as the default keyId if none is provided in the value
                identity_logic::normalize_public_key(i as u32, v)
            })
            .collect::<Vec<IIdentityPublicKey>>();
        IIdentityData {
            identity_id: payload.identity_id,
            username: payload.username,
            balance: payload.balance,
            revision: payload.revision,
            public_keys: normalized_keys,
            identity_idx: payload.identity_idx,
            dpns_username: payload.dpns_username,
            is_authenticated: true,
            created_at: Some(
                payload
                    .created_at
                    .unwrap_or_else(|| Utc::now().to_rfc3339()),
            ),
            public_key_ids: payload.public_key_ids,
        }
    }
}
#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct ISaveIdentityPayload {
    pub identity_id: String,
    pub username: String,
    pub balance: String,
    pub revision: u32,
    pub public_keys: Vec<IAnyValue>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identity_idx: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dpns_username: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub public_key_ids: Option<Vec<u32>>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub active_identity_id: Option<String>,
}

/// Response for load_active_identity: returns identity data plus the active marker
#[derive(Serialize, Deserialize, Clone, Debug, Type)]
#[serde(rename_all = "camelCase")]
pub struct IActiveIdentityResponse {
    pub active_identity_id: Option<String>,
    pub identity: Option<IIdentityData>,
    pub identity_count: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type)]
#[serde(rename_all = "camelCase")]
pub struct IUnifiedCommandResult {
    pub success: bool,
    pub error: Option<String>,
    pub payload: Option<IAnyValue>,
}
#[tauri::command]
#[specta::specta]
pub async fn discover_and_save_identity(
    app: tauri::AppHandle,
    identity_id: String,
    network: String,
) -> ICommandResult<IUnifiedCommandResult> {
    cmd_res!(discover_and_save_identity_inner(app, identity_id, network).await)
}
pub async fn discover_and_save_identity_inner<R: Runtime>(
    app: tauri::AppHandle<R>,
    identity_id: String,
    network: String,
) -> Result<IUnifiedCommandResult, String> {
    let client = get_dapi_client();
    let net = Network::from_str(&network).unwrap_or(Network::Testnet);
    let raw_identities = client
        .get_identity(identity_id.clone(), net)
        .await
        .map_err(|e| e.to_string())?;
    let dapi_identity: Identity = serde_json::from_value(
        raw_identities
            .first()
            .ok_or_else(|| "Identity not found on chain".to_string())?
            .clone(),
    )
    .map_err(|e| format!("Failed to parse chain identity: {}", e))?;
    let dpns_names = client
        .get_dpns_usernames(identity_id.clone(), net)
        .await
        .unwrap_or_default();
    let username = dpns_names
        .first()
        .and_then(|v| v.as_str())
        .unwrap_or("Unknown")
        .to_string();
    let payload = ISaveIdentityPayload {
        identity_id: identity_id.clone(),
        username: username.clone(),
        balance: dapi_identity.balance.clone().unwrap_or_else(|| "0".into()),
        revision: dapi_identity.revision.unwrap_or(0),
        public_keys: dapi_identity
            .public_keys
            .iter()
            .map(|pk| IAnyValue(serde_json::to_value(pk).unwrap()))
            .collect(),
        dpns_username: Some(username),
        ..Default::default()
    };
    save_identity_inner(app, network, payload).await
}
#[tauri::command]
#[specta::specta]
pub async fn save_identity_with_keys(
    app: tauri::AppHandle,
    network: String,
    identity_payload: ISaveIdentityPayload,
    keys: Vec<IPrivateKeyEntry>,
) -> ICommandResult<IUnifiedCommandResult> {
    let manager = StoreManager::new(&app);
    cmd_res!(save_identity_with_keys_logic(&manager, network, identity_payload, keys).await)
}
pub async fn save_identity_with_keys_logic<S: PersistentStore>(
    store: &S,
    network: String,
    identity_payload: ISaveIdentityPayload,
    keys: Vec<IPrivateKeyEntry>,
) -> Result<IUnifiedCommandResult, String> {
    // 1. Save Identity metadata
    save_identity_logic(store, network.clone(), identity_payload.clone()).await?;
    // 2. Save Key material (SAFU)
    save_keys_logic(store, network, identity_payload.identity_id, keys).await?;
    Ok(IUnifiedCommandResult {
        success: true,
        error: None,
        payload: None,
    })
}
#[tauri::command]
#[specta::specta]
pub async fn save_identity(
    app: tauri::AppHandle,
    network: String,
    payload: ISaveIdentityPayload,
) -> ICommandResult<IUnifiedCommandResult> {
    let manager = StoreManager::new(&app);
    cmd_res!(save_identity_logic(&manager, network, payload).await)
}
pub async fn save_identity_logic<S: PersistentStore>(
    store: &S,
    network: String,
    payload: ISaveIdentityPayload,
) -> Result<IUnifiedCommandResult, String> {
    let identity_id = payload.identity_id.clone();

    let mut map = storage::load_identity_map_internal(store, &network)?;

    // Determine the active identity ID:
    // 1. Explicit override from payload takes priority
    // 2. Otherwise, the identity being saved becomes active (default behavior)
    // This ensures that connecting to an identity ALWAYS marks it as active,
    // regardless of whether the map was previously empty or populated.
    let active_id = Some(
        payload
            .active_identity_id
            .clone()
            .unwrap_or_else(|| identity_id.clone()),
    );

    let identity = IdentityMapper::map_to_identity(payload);
    map.insert(identity_id.clone(), identity);
    storage::save_identity_map_internal(store, &network, &map, active_id)?;
    Ok(IUnifiedCommandResult {
        success: true,
        error: None,
        payload: Some(IAnyValue(serde_json::json!({ "identityId": identity_id }))),
    })
}
pub async fn save_identity_inner<R: Runtime>(
    app: tauri::AppHandle<R>,
    network: String,
    payload: ISaveIdentityPayload,
) -> Result<IUnifiedCommandResult, String> {
    let manager = StoreManager::new(&app);
    save_identity_logic(&manager, network, payload).await
}

/// Load the active identity for a given network.
/// Returns the active identity ID, the identity data (if found), and total count.
/// This is the primary command used by the frontend to restore session on app reload.
#[tauri::command]
#[specta::specta]
pub async fn load_active_identity(
    app: tauri::AppHandle,
    network: String,
) -> ICommandResult<IActiveIdentityResponse> {
    let manager = StoreManager::new(&app);
    cmd_res!(load_active_identity_logic(&manager, network))
}

pub fn load_active_identity_logic<S: PersistentStore>(
    store: &S,
    network: String,
) -> Result<IActiveIdentityResponse, String> {
    let filename = crate::utils::network_file::get_network_file(&network, "identity")?;

    // Load the raw JSON value to extract __active_identity_id marker
    let raw_value = store
        .load_value(&filename, "identities")
        .map_err(|e| e.to_string())?;

    let active_identity_id = raw_value
        .as_ref()
        .and_then(|v| v.as_object())
        .and_then(|obj| obj.get("__active_identity_id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // Parse the full identity map (skips __ prefixed keys)
    let map = match raw_value {
        Some(val) => storage::process_raw_identity_map(val),
        None => std::collections::HashMap::new(),
    };

    let identity_count = map.len() as u32;

    // Look up the active identity data
    let identity = active_identity_id
        .as_ref()
        .and_then(|id| map.get(id))
        .cloned();

    Ok(IActiveIdentityResponse {
        active_identity_id,
        identity,
        identity_count,
    })
}

/// Load all identities for a given network.
/// Returns the raw identity map as a JSON value for the Identity Manager screen.
#[tauri::command]
#[specta::specta]
pub async fn load_identities_map(
    app: tauri::AppHandle,
    network: String,
) -> ICommandResult<IAnyValue> {
    let manager = StoreManager::new(&app);
    cmd_res!(load_identities_map_logic(&manager, network))
}

pub fn load_identities_map_logic<S: PersistentStore>(
    store: &S,
    network: String,
) -> Result<IAnyValue, String> {
    let map = storage::load_identity_map_internal(store, &network)?;
    serde_json::to_value(map)
        .map(IAnyValue)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn delete_identity(
    app: tauri::AppHandle,
    network: String,
    identity_id: Option<String>,
) -> ICommandResult<bool> {
    cmd_res!(delete_identity_inner(app, network, identity_id).await)
}
pub async fn delete_identity_inner<R: Runtime>(
    app: tauri::AppHandle<R>,
    network: String,
    identity_id: Option<String>,
) -> Result<bool, String> {
    let manager = StoreManager::new(&app);
    if let Some(id) = identity_id {
        let mut map = storage::load_identity_map_internal(&manager, &network)?;
        if map.remove(&id).is_some() {
            storage::save_identity_map_internal(&manager, &network, &map, None)?;
            return Ok(true);
        }
        Ok(false)
    } else {
        let filename = crate::utils::network_file::get_network_file(&network, "identity")?;
        manager
            .delete_value(&filename, "identities")
            .map(|_| true)
            .map_err(|e| e.to_string())
    }
}
#[tauri::command]
#[specta::specta]
pub async fn save_keys(
    app: tauri::AppHandle,
    network: String,
    identity_id: String,
    keys: Vec<IPrivateKeyEntry>,
) -> ICommandResult<bool> {
    let manager = StoreManager::new(&app);
    cmd_res!(save_keys_logic(&manager, network, identity_id, keys).await)
}
pub async fn save_keys_logic<S: PersistentStore>(
    store: &S,
    network: String,
    identity_id: String,
    keys: Vec<IPrivateKeyEntry>,
) -> Result<bool, String> {
    let mut keystore = storage::load_keystore_internal(store, &network)?;
    {
        let entries = keystore.identities.entry(identity_id.clone()).or_default();
        for k in keys {
            if let Some(existing) = entries.iter_mut().find(|e| e.key_id == k.key_id) {
                *existing = k;
            } else {
                entries.push(k);
            }
        }
        let current_identities = storage::load_identity_map_internal(store, &network)?;
        if let Some(identity_data) = current_identities.get(&identity_id) {
            identity_logic::enrich_key_entries(entries, identity_data);
        }
    }
    storage::save_keystore_internal(store, &network, &keystore)
        .map(|_| true)
        .map_err(|e| e.to_string())
}
pub async fn save_keys_inner<R: Runtime>(
    app: tauri::AppHandle<R>,
    network: String,
    identity_id: String,
    keys: Vec<IPrivateKeyEntry>,
) -> Result<bool, String> {
    let manager = StoreManager::new(&app);
    save_keys_logic(&manager, network, identity_id, keys).await
}
#[tauri::command]
#[specta::specta]
pub async fn load_keystore(app: tauri::AppHandle, network: String) -> ICommandResult<IAnyValue> {
    cmd_res!(load_keystore_inner(app, network).await)
}
pub async fn load_keystore_inner<R: Runtime>(
    app: tauri::AppHandle<R>,
    network: String,
) -> Result<IAnyValue, String> {
    let manager = StoreManager::new(&app);
    let data = storage::load_keystore_internal(&manager, &network)?;
    serde_json::to_value(data)
        .map(IAnyValue)
        .map_err(|e| e.to_string())
}
