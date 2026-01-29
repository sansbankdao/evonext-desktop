// src-tauri/src/commands/identity_commands.rs

use crate::identity::{lib as identity_logic, storage};
use crate::models::{IdentityData, IdentityPublicKey, PrivateKeyEntry};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use tauri::AppHandle;
use ts_rs::TS;
// =====================================================
// Public API Types
// =====================================================
#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../src/types/rust/")]
pub struct UnifiedCommandResult {
    pub success: bool,
    pub error: Option<String>,
    #[ts(type = "unknown")]
    pub payload: Option<JsonValue>,
}
#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../src/types/rust/")]
pub struct SaveIdentityPayload {
    pub identity_id: String,
    pub identity_idx: Option<u32>,
    pub username: Option<String>,
    pub dpns_username: Option<String>,
    pub balance: Option<String>,
    #[ts(type = "unknown")]
    pub revision: Option<JsonValue>,
    #[ts(type = "unknown[]")]
    pub public_keys: Option<Vec<JsonValue>>,
    pub created_at: Option<String>,
    #[serde(default)]
    pub active_identity_id: Option<String>,
}
// =====================================================
// Commands
// =====================================================
#[tauri::command]
pub async fn save_identity_unified(
    app: AppHandle,
    network: String,
    payload: SaveIdentityPayload,
) -> Result<UnifiedCommandResult, String> {
    // 1. Normalize Revision
    let revision_u64: Option<u64> = match payload.revision.as_ref() {
        Some(JsonValue::Number(n)) => n.as_u64(),
        Some(JsonValue::String(s)) => s.parse::<u64>().ok(),
        Some(_) => None,
        None => None,
    };
    // 2. Normalize Public Keys (delegated to logic lib)
    let normalized_public_keys = payload.public_keys.as_ref().map(|raw_vec| {
        raw_vec
            .iter()
            .enumerate()
            .filter_map(|(i, v)| identity_logic::normalize_public_key(i as u32, v))
            .collect::<Vec<IdentityPublicKey>>()
    });
    // 3. Construct IdentityData
    let identity = IdentityData {
        username: payload.username.clone().unwrap_or_else(|| payload.identity_id.clone()),
        identity_id: payload.identity_id.clone(),
        identity_idx: payload.identity_idx.unwrap_or(0),
        balance: payload.balance.clone(),
        is_authenticated: true,
        public_keys: normalized_public_keys,
        revision: revision_u64,
        created_at: Some(payload.created_at.clone().unwrap_or_else(|| Utc::now().to_rfc3339())),
        public_key_ids: None,
    };
    // 4. Persist (delegated to storage lib)
    let mut map = storage::load_identity_map(&app, &network)?;
    map.insert(payload.identity_id.clone(), identity);
    storage::save_identity_map(&app, &network, &map, payload.active_identity_id)?;
    Ok(UnifiedCommandResult {
        success: true,
        error: None,
        payload: Some(serde_json::json!({
            "identityId": payload.identity_id,
            "revision": revision_u64
        })),
    })
}
#[tauri::command]
pub async fn load_identities_map(app: AppHandle, network: String) -> Result<JsonValue, String> {
    Ok(serde_json::to_value(storage::load_identity_map(&app, &network)?))
}
#[tauri::command]
pub async fn delete_identity_data(
    app: AppHandle,
    network: String,
    identity_id: Option<String>,
) -> Result<bool, String> {
    use crate::utils::StoreManager;
    if let Some(id) = identity_id {
        let mut map = storage::load_identity_map(&app, &network)?;
        if map.remove(&id).is_some() {
            storage::save_identity_map(&app, &network, &map, None)?;
            Ok(true)
        } else {
            Ok(false)
        }
    } else {
        let manager = StoreManager::new(&app);
        let filename = crate::utils::network_file::get_network_file(&network, "identity")?;
        manager.delete(filename, "identities").map(|_| true).map_err(|e| e.to_string())
    }
}
#[tauri::command]
pub async fn save_identity_data(
    app: AppHandle,
    network: String,
    identity: IdentityData,
) -> Result<bool, String> {
    let mut map = storage::load_identity_map(&app, &network)?;
    map.insert(identity.identity_id.clone(), identity);
    storage::save_identity_map(&app, &network, &map, None)?;
    Ok(true)
}
// =====================================================
// Keystore Commands
// =====================================================
#[tauri::command]
pub async fn enrich_keystore_for_identity(
    app: AppHandle,
    network: String,
    identity_id: String,
) -> Result<UnifiedCommandResult, String> {
    // 1. Load Identity
    let map = storage::load_identity_map(&app, &network)?;
    let identity = map.get(&identity_id)
        .ok_or("Identity not found in local storage")?;
    // 2. Load Keystore
    let mut store = storage::load_keystore(&app, &network)?;
    let entries = store.identities.get_mut(&identity_id)
        .ok_or(format!("No private keys found for identity {}", identity_id))?;
    // 3. Enrich (delegated to logic lib)
    let updated_count = identity_logic::enrich_key_entries(entries, identity);
    // 4. Save
    storage::save_keystore(&app, &network, &store)?;
    Ok(UnifiedCommandResult {
        success: true,
        error: None,
        payload: Some(serde_json::json!({ "updatedCount": updated_count })),
    })
}
#[tauri::command]
pub async fn load_private_keys(app: AppHandle, network: String) -> Result<Option<JsonValue>, String> {
    Ok(Some(serde_json::to_value(storage::load_keystore(&app, &network)?)))
}
#[tauri::command]
pub async fn save_private_keys(
    app: AppHandle,
    network: String,
    identity_id: String,
    keys: Vec<PrivateKeyEntry>,
) -> Result<bool, String> {
    let mut store = storage::load_keystore(&app, &network)?;
    let entries = store.identities.entry(identity_id).or_default();
    for k in keys {
        if let Some(existing) = entries.iter_mut().find(|e| e.key_id == k.key_id) {
            *existing = k;
        } else {
            entries.push(k);
        }
    }
    storage::save_keystore(&app, &network, &store)?;
    Ok(true)
}
#[tauri::command]
pub async fn delete_private_keys(
    app: AppHandle,
    network: String,
    identity_id: Option<String>,
) -> Result<bool, String> {
    use crate::utils::StoreManager;
    if let Some(id) = identity_id {
        let mut store = storage::load_keystore(&app, &network)?;
        if store.identities.remove(&id).is_some() {
            storage::save_keystore(&app, &network, &store)?;
            Ok(true)
        } else {
            Ok(false)
        }
    } else {
        let manager = StoreManager::new(&app);
        let filename = crate::utils::network_file::get_network_file(&network, "safu")?;
        manager.delete(filename, "keystore").map(|_| true).map_err(|e| e.to_string())
    }
}
#[tauri::command]
pub async fn save_single_identity_keys(
    app: AppHandle,
    network: String,
    identity_id: String,
    key: PrivateKeyEntry,
) -> Result<bool, String> {
    save_private_keys(app, network, identity_id, vec![key]).await
}
#[tauri::command]
pub async fn save_imported_key(
    app: AppHandle,
    identity_id: String,
    key_id: u32,
    private_key_hex: String,
    network: String,
) -> Result<bool, String> {
    let mut store = storage::load_keystore(&app, &network)?;
    let entries = store.identities.entry(identity_id.clone()).or_default();
    // Derive PubKey (Logic Lib)
    let pub_hex = identity_logic::derive_compressed_pubkey_hex_from_wif(&private_key_hex)
        .ok_or("Invalid private key format")?;
    let new_entry = PrivateKeyEntry {
        identity_id: identity_id.clone(),
        key_id,
        private_key: private_key_hex,
        public_key: pub_hex,
        purpose: 0,
        security_level: 0,
        key_type: "ECDSA_HASH160".into(),
        created_at: Utc::now().to_rfc3339(),
        last_used: Utc::now().to_rfc3339(),
        derived_from_mnemonic: Some(false),
    };
    if let Some(existing) = entries.iter_mut().find(|e| e.key_id == key_id) {
        *existing = new_entry;
    } else {
        entries.push(new_entry);
    }
    storage::save_keystore(&app, &network, &store)?;
    let _ = enrich_keystore_for_identity(app, network, identity_id).await;
    Ok(true)
}
