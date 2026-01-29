// src-tauri/src/commands/identity_commands.rs

use crate::identity::{lib as identity_logic, storage};
use crate::models::{IdentityData, IdentityPublicKey, PrivateKeyEntry};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use tauri::AppHandle;
use specta::Type;

// =====================================================
// Unified Data Structures
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Type)]
#[serde(rename_all = "camelCase")]
pub struct UnifiedCommandResult {
    pub success: bool,
    pub error: Option<String>,
    pub payload: Option<JsonValue>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct SaveIdentityPayload {
    pub identity_id: String,
    pub identity_idx: Option<u32>,
    pub username: Option<String>,
    pub dpns_username: Option<String>,
    pub balance: Option<String>,
    pub revision: Option<JsonValue>,
    pub public_keys: Option<Vec<JsonValue>>,
    pub created_at: Option<String>,
    #[serde(default)]
    pub active_identity_id: Option<String>,
}

// =====================================================
// Identity Commands
// =====================================================

#[tauri::command]
#[specta::specta]
pub async fn save_identity(
    app: AppHandle,
    network: String,
    payload: SaveIdentityPayload,
) -> Result<UnifiedCommandResult, String> {
    // 1. Data Normalization (Handle Revision)
    let revision_u64 = match payload.revision {
        Some(JsonValue::Number(n)) => n.as_u64(),
        Some(JsonValue::String(s)) => s.parse::<u64>().ok(),
        _ => None,
    };

    // 2. Normalize Public Keys
    let normalized_public_keys = payload.public_keys.map(|raw_vec| {
        raw_vec
            .iter()
            .enumerate()
            .filter_map(|(i, v)| identity_logic::normalize_public_key(i as u32, v))
            .collect::<Vec<IdentityPublicKey>>()
    });

    // 3. Construct the Canonical Identity Object
    let identity = IdentityData {
        username: payload.username.unwrap_or_else(|| payload.identity_id.clone()),
        identity_id: payload.identity_id.clone(),
        identity_idx: payload.identity_idx.unwrap_or(0),
        balance: payload.balance,
        is_authenticated: true,
        public_keys: normalized_public_keys,
        revision: revision_u64,
        created_at: Some(payload.created_at.unwrap_or_else(|| Utc::now().to_rfc3339())),
        public_key_ids: None,
    };

    // 4. Persistence
    let mut map = storage::load_identity_map(&app, &network)?;
    map.insert(payload.identity_id.clone(), identity);
    storage::save_identity_map(&app, &network, &map, payload.active_identity_id)?;

    Ok(UnifiedCommandResult {
        success: true,
        error: None,
        payload: Some(serde_json::json!({ "identityId": payload.identity_id })),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn delete_identity(
    app: AppHandle,
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
        // Full reset
        let filename = crate::utils::network_file::get_network_file(&network, "identity")?;
        crate::utils::StoreManager::new(&app).delete(filename, "identities").map(|_| true).map_err(|e| e.to_string())
    }
}

// =====================================================
// Keystore Commands
// =====================================================

#[tauri::command]
#[specta::specta]
pub async fn save_keys(
    app: AppHandle,
    network: String,
    identity_id: String,
    keys: Vec<PrivateKeyEntry>,
) -> Result<bool, String> {
    let mut store = storage::load_keystore(&app, &network)?;
    let entries = store.identities.entry(identity_id.clone()).or_default();

    for k in keys {
        if let Some(existing) = entries.iter_mut().find(|e| e.key_id == k.key_id) {
            *existing = k;
        } else {
            entries.push(k);
        }
    }

    storage::save_keystore(&app, &network, &store)?;
    // Automatically trigger enrichment
    let _ = identity_logic::enrich_key_entries(entries, &IdentityData { identity_id, ..Default::default() });

    Ok(true)
}

#[tauri::command]
#[specta::specta]
pub async fn load_keystore(app: AppHandle, network: String) -> Result<JsonValue, String> {
    serde_json::to_value(storage::load_keystore(&app, &network)?).map_err(|e| e.to_string())
}

// =====================================================
// Regression Tests
// =====================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::{mock_builder, mock_context, noop_assets};

    #[tokio::test]
    async fn test_identity_lifecycle() {
        let app = mock_builder().build(mock_context(noop_assets())).unwrap();
        let payload = SaveIdentityPayload {
            identity_id: "test_id".into(),
            username: Some("test_user".into()),
            ..Default::default()
        };

        // Test Save
        let save_result = save_identity(app.handle().clone(), "mainnet".into(), payload).await;
        assert!(save_result.is_ok());

        // Test Delete
        let delete_result = delete_identity(app.handle().clone(), "mainnet".into(), Some("test_id".into())).await;
        assert!(delete_result.is_ok());
    }
}
