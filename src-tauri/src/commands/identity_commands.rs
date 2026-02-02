// src-tauri/src/commands/identity_commands.rs

use crate::identity::{lib as identity_logic, storage};
use crate::models::{IIdentityData, IIdentityPublicKey, IPrivateKeyEntry, IAnyValue};
use crate::utils::StoreManager;
use chrono::Utc;
use serde::{Deserialize, Serialize};
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
    pub username: String,
    pub balance: String,
    pub revision: u32,
    pub public_keys: Vec<IAnyValue>,
    pub identity_idx: Option<u32>,
    pub dpns_username: Option<String>,
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
    // 1. Normalize Public Keys
    // Since public_keys is now Vec<IAnyValue> (not Option), we iterate directly
    let normalized_public_keys = payload.public_keys
        .iter()
        .enumerate()
        .filter_map(|(i, IAnyValue(v))| identity_logic::normalize_public_key(i as u32, v))
        .collect::<Vec<IIdentityPublicKey>>();

    // 2. Construct the Canonical Identity Object
    // Matching the exact structure of IIdentityData in models.rs
    let identity = IIdentityData {
        identity_id: payload.identity_id.clone(),
        username: payload.username,
        balance: payload.balance,
        revision: payload.revision,
        public_keys: normalized_public_keys,
        identity_idx: payload.identity_idx,
        dpns_username: payload.dpns_username,
        is_authenticated: true,
        created_at: Some(payload.created_at.unwrap_or_else(|| Utc::now().to_rfc3339())),
        public_key_ids: None,
    };

    // 3. Persistence
    let mut map = storage::load_identity_map(&app, &network)?;
    map.insert(payload.identity_id.clone(), identity);

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

        let current_identities = storage::load_identity_map(&app, &network)?;
        if let Some(identity_data) = current_identities.get(&identity_id) {
            identity_logic::enrich_key_entries(entries, identity_data);
        }
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
// Anti-Regression Suite
// =====================================================

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::{mock_builder, mock_context, noop_assets};

    #[tokio::test]
    async fn test_save_identity_regression() {
        let app = mock_builder()
            .plugin(tauri_plugin_store::Builder::default().build())
            .build(mock_context(noop_assets()))
            .unwrap();
        let handle = app.handle();

        let payload = ISaveIdentityPayload {
            identity_id: "test_reg_id".into(),
            username: "test_user".into(),
            balance: "1000".into(),
            revision: 1,
            public_keys: vec![IAnyValue(serde_json::json!({
                "id": 0,
                "type": "ECDSA_SECP256K1",
                "purpose": 0,
                "securityLevel": 0,
                "data": "00112233445566778899aabbccddeeff"
            }))],
            ..Default::default()
        };

        // 1. Execute Command
        let result = save_identity(handle.clone(), "testnet".into(), payload).await.unwrap();
        assert!(result.success);

        // 2. Verify Storage Integrity
        let map = storage::load_identity_map(handle, "testnet").unwrap();
        let data = map.get("test_reg_id").expect("Identity was lost in storage cycle");

        assert_eq!(data.username, "test_user");
        assert!(!data.public_keys.is_empty(), "Public keys dropped during normalization");
        assert_eq!(data.public_keys[0].data, "00112233445566778899aabbccddeeff");
    }

    #[tokio::test]
    async fn test_keystore_persistence() {
        let app = mock_builder()
            .plugin(tauri_plugin_store::Builder::default().build())
            .build(mock_context(noop_assets()))
            .unwrap();
        let handle = app.handle();

        let keys = vec![IPrivateKeyEntry {
            identity_id: "test_id".into(),
            key_id: 5,
            private_key: "secret".into(),
            public_key: "pub".into(),
            ..Default::default()
        }];

        let result = save_keys(handle.clone(), "testnet".into(), "test_id".into(), keys).await.unwrap();
        assert!(result);

        let loaded = load_keystore(handle.clone(), "testnet".into()).await.unwrap();
        let val = loaded.0;
        assert!(val.get("identities").unwrap().get("test_id").is_some());
    }
}
