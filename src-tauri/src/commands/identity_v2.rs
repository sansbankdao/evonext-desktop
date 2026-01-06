// src-tauri/src/commands/identity_v2.rs

use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use chrono::Utc;
use crate::models::{IdentityData, IdentityPublicKey};
use crate::utils::StoreManager;
use crate::utils::network_file::get_network_file;
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct UnifiedCommandResult {
    pub success: bool,
    pub error: Option<String>,
    pub payload: Option<JsonValue>,
}
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct SaveIdentityPayload {
    pub identity_id: String,
    pub identity_idx: Option<u32>,
    pub balance: Option<String>,
    pub public_keys: Option<Vec<IdentityPublicKey>>,
    pub revision: Option<JsonValue>,       // string | number | null
    pub dpns_username: Option<String>,
    pub username: Option<String>,
}
#[tauri::command]
pub async fn save_identity_unified(
    app: AppHandle,
    payload: SaveIdentityPayload,
    network: String,
) -> Result<UnifiedCommandResult, String> {
    println!("[Unified] save_identity_unified: network={}", network);
    println!("[Unified] payload={}", serde_json::to_string(&payload).unwrap_or_default());
    // Tolerant parse for revision
    let revision_u64: Option<u64> = match payload.revision {
        Some(JsonValue::Number(n)) => n.as_u64(),
        Some(JsonValue::String(s)) => s.parse::<u64>().ok(),
        Some(_) => None,
        None => None,
    };
    // Build the IdentityData record
    let identity = IdentityData {
        username: payload.username.clone().unwrap_or_else(|| payload.identity_id.clone()),
        identity_id: payload.identity_id.clone(),
        identity_idx: payload.identity_idx.unwrap_or(0),
        balance: payload.balance.clone(),
        is_authenticated: true,
        public_keys: payload.public_keys.clone(),
        revision: revision_u64,
        created_at: Some(Utc::now().to_rfc3339()),
        public_key_ids: payload
            .public_keys
            .as_ref()
            .map(|v| v.iter().filter_map(|pk| Some(pk.id)).collect()),
    };
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "identity")?;
    match manager.save(filename, "identity", &identity) {
        Ok(_) => {
            println!("[Unified] identity file written for {}", payload.identity_id);
            Ok(UnifiedCommandResult {
                success: true,
                error: None,
                payload: Some(serde_json::json!({
                    "identityId": identity.identity_id,
                    "identityIdx": identity.identity_idx,
                    "revision": identity.revision,
                    "dpnsUsername": payload.dpns_username
                })),
            })
        }
        Err(e) => {
            let msg = format!("Failed to save identity file: {}", e);
            eprintln!("[Unified] {}", msg);
            Ok(UnifiedCommandResult {
                success: false,
                error: Some(msg),
                payload: None,
            })
        }
    }
}
#[tauri::command]
pub async fn query_and_update_identity(
    app: AppHandle,
    network: String,
    identity_id: String,
) -> Result<UnifiedCommandResult, String> {
    println!("[Unified] query_and_update_identity: network={}, id={}", network, identity_id);
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "identity")?;
    match manager.load::<IdentityData>(filename, "identity") {
        Ok(Some(data)) => Ok(UnifiedCommandResult {
            success: true,
            error: None,
            payload: Some(serde_json::to_value(&data).unwrap_or(JsonValue::Null)),
        }),
        Ok(None) => Ok(UnifiedCommandResult {
            success: false,
            error: Some("No identity stored".to_string()),
            payload: None,
        }),
        Err(e) => Ok(UnifiedCommandResult {
            success: false,
            error: Some(format!("Failed to load identity: {}", e)),
            payload: None,
        }),
    }
}
