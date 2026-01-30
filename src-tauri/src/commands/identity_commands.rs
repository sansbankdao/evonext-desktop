// src-tauri/src/commands/identity_commands.rs

use crate::identity::{lib as identity_logic, storage};
use crate::models::{IIdentityData, IIdentityPublicKey, IPrivateKeyEntry, IAnyValue};
use crate::utils::StoreManager;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use tauri::{AppHandle, Runtime};
use specta::Type;

// =====================================================
// Unified Data Structures
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Type)]
#[serde(rename_all = "camelCase")]
pub struct IUnifiedCommandResult {
    pub success: bool,
    pub error: Option<String>,
    pub payload: Option<IAnyValue>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct ISaveIdentityPayload {
    pub identity_id: String,
    pub identity_idx: Option<u32>,
    pub username: Option<String>,
    pub dpns_username: Option<String>,
    pub balance: Option<String>,
    pub revision: Option<IAnyValue>,
    pub public_keys: Option<Vec<IAnyValue>>,
    pub created_at: Option<String>,
    #[serde(default)]
    pub active_identity_id: Option<String>,
}

// =====================================================
// Identity Commands
// =====================================================

#[tauri::command]
#[specta::specta]
pub async fn save_identity<R: Runtime>(
    app: AppHandle<R>,
    network: String,
    payload: ISaveIdentityPayload,
) -> Result<IUnifiedCommandResult, String> {
    // 1. Data Normalization
    let revision_u64 = match payload.revision {
        Some(IAnyValue(JsonValue::Number(n))) => n.as_u64(),
        Some(IAnyValue(JsonValue::String(s))) => s.parse::<u64>().ok(),
        _ => None,
    };

    // 2. Normalize Public Keys
    let normalized_public_keys = payload.public_keys.map(|raw_vec| {
        raw_vec
            .iter()
            .enumerate()
            .filter_map(|(i, IAnyValue(v))| identity_logic::normalize_public_key(i as u32, v))
            .collect::<Vec<IIdentityPublicKey>>()
    });

    // 3. Construct the Canonical Identity Object
    let identity = IIdentityData {
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

    // Pass payload.active_identity_id directly (Option<String>)
    storage::save_identity_map(&app, &network, &map, payload.active_identity_id)?;

    Ok(IUnifiedCommandResult {
        success: true,
        error: None,
        payload: Some(IAnyValue(serde_json::json!({ "identityId": payload.identity_id }))),
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

// =====================================================
// Keystore Commands
// =====================================================

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
        let dummy_id = IIdentityData { identity_id: identity_id.clone(), ..Default::default() };
        identity_logic::enrich_key_entries(entries, &dummy_id);
    }

    storage::save_keystore(&app, &network, &keystore)?;
    Ok(true)
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

// =====================================================
// Regression Tests
// =====================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::{mock_builder, mock_context, noop_assets};
    use tauri::Manager;

    #[tokio::test]
    async fn test_identity_lifecycle() {
        // 1. Initialize the app with the required Store plugin
        let app = mock_builder()
            .plugin(tauri_plugin_store::Builder::default().build())
            .build(mock_context(noop_assets()))
            .unwrap();

        // 2. Ensure any custom state needed by your storage logic is managed
        // If your StoreManager needs specific setup, do it here.

        let handle = app.handle();
        let network = "mainnet".to_string();
        let test_id = "test_identity_123".to_string();

        let payload = ISaveIdentityPayload {
            identity_id: test_id.clone(),
            username: Some("tester".into()),
            ..Default::default()
        };

        // 3. Test Save
        let save_result = save_identity(
            handle.clone(),
            network.clone(),
            payload
        ).await;

        assert!(save_result.is_ok(), "Save failed: {:?}", save_result.err());

        // 4. Test Delete
        let delete_result = delete_identity(
            handle.clone(),
            network.clone(),
            Some(test_id)
        ).await;

        assert!(delete_result.is_ok());
        assert!(delete_result.unwrap());
    }
}
