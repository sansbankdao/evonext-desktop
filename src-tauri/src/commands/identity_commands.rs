// src-tauri/src/commands/identity_commands.rs

use crate::identity::{lib as identity_logic, storage};
use crate::models::{IIdentityData, IIdentityPublicKey, IPrivateKeyEntry, IAnyValue};
use crate::utils::StoreManager;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};
use specta::Type;

#[cfg(test)]
mod tests;

pub struct IdentityMapper;

impl IdentityMapper {
    /// Maps the frontend payload to the internal Rust storage model.
    /// Includes the fix for the Identity Manager regression by preserving public_key_ids.
    pub fn map_to_identity(payload: ISaveIdentityPayload) -> IIdentityData {
        let normalized_keys = payload.public_keys
            .iter()
            .enumerate()
            .filter_map(|(i, IAnyValue(v))| identity_logic::normalize_public_key(i as u32, v))
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
            created_at: Some(payload.created_at.unwrap_or_else(|| Utc::now().to_rfc3339())),
            // FIX: Restore publicKeyIds mapping to prevent regression in Identity Manager
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
    pub identity_idx: Option<u32>,
    pub dpns_username: Option<String>,
    pub created_at: Option<String>,
    pub public_key_ids: Option<Vec<u32>>, // Required to restore discovery data in Manager screen
    #[serde(default)]
    pub active_identity_id: Option<String>,
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
pub async fn save_identity<R: Runtime>(
    app: AppHandle<R>,
    network: String,
    payload: ISaveIdentityPayload,
) -> Result<IUnifiedCommandResult, String> {
    let identity_id = payload.identity_id.clone();

    let mut map = storage::load_identity_map(&app, &network)?;

    // Auto-promote to Active if this is the first identity being connected
    let active_id = payload.active_identity_id.clone().or_else(|| {
        if map.is_empty() { Some(identity_id.clone()) } else { None }
    });

    let identity = IdentityMapper::map_to_identity(payload);
    map.insert(identity_id.clone(), identity);

    storage::save_identity_map(&app, &network, &map, active_id)?;

    Ok(IUnifiedCommandResult {
        success: true,
        error: None,
        payload: Some(IAnyValue(serde_json::json!({ "identityId": identity_id }))),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn delete_identity<R: Runtime>(
    app: AppHandle<R>,
    network: String,
    identity_id: Option<String>,
) -> Result<bool, String> {
    if let Some(id) = identity_id {
        let mut map = storage::load_identity_map(&app, &network)?;
        if map.remove(&id).is_some() {
            storage::save_identity_map(&app, &network, &map, None)?;
            return Ok(true);
        }
        Ok(false)
    } else {
        let filename = crate::utils::network_file::get_network_file(&network, "identity")?;
        StoreManager::new(&app)
            .delete(filename, "identities")
            .map(|_| true)
            .map_err(|e| e.to_string())
    }
}

#[tauri::command]
#[specta::specta]
pub async fn save_keys<R: Runtime>(
    app: AppHandle<R>,
    network: String,
    identity_id: String,
    keys: Vec<IPrivateKeyEntry>,
) -> Result<bool, String> {
    let mut keystore = storage::load_keystore(&app, &network)?;
    {
        let entries = keystore.identities.entry(identity_id.clone()).or_default();
        for k in keys {
            if let Some(existing) = entries.iter_mut().find(|e| e.key_id == k.key_id) {
                *existing = k;
            } else {
                entries.push(k);
            }
        }

        // Enrich the keys with metadata (Purpose, SecurityLevel) by matching
        // against the public keys stored in the identity map.
        let current_identities = storage::load_identity_map(&app, &network)?;
        if let Some(identity_data) = current_identities.get(&identity_id) {
            identity_logic::enrich_key_entries(entries, identity_data);
        }
    }

    storage::save_keystore(&app, &network, &keystore)
        .map(|_| true)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn load_keystore<R: Runtime>(
    app: AppHandle<R>,
    network: String
) -> Result<IAnyValue, String> {
    let data = storage::load_keystore(&app, &network)?;
    serde_json::to_value(data)
        .map(IAnyValue)
        .map_err(|e| e.to_string())
}
