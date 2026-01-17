// src-tauri/src/commands/identity_commands.rs

use crate::models::{IdentityData, IdentityPublicKey, PrivateKeyEntry, PrivateKeyStore};
use crate::utils::network_file::get_network_file;
use crate::utils::StoreManager;
use base64::{engine::general_purpose, Engine};
use bitcoin::secp256k1::Secp256k1;
use bitcoin::PrivateKey;
use chrono::Utc;
use ripemd::Ripemd160;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sha2::{Digest as ShaDigest, Sha256};
use std::collections::HashMap;
use tauri::AppHandle;
use ts_rs::TS;
type IdentityMap = HashMap<String, IdentityData>;
// =====================================================
// Public API Types (TS Export)
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
    pub revision: Option<JsonValue>, // number | string | null
    #[ts(type = "unknown[]")]
    pub public_keys: Option<Vec<JsonValue>>, // tolerant; normalized here
    pub created_at: Option<String>,
    // We want to allow the frontend to pass this to persist the active choice
    #[serde(default)]
    pub active_identity_id: Option<String>,
}
// =====================================================
// Identity Commands
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
    // 2. Normalize Public Keys (accepts DAPI-like and our internal shapes)
    let normalized_public_keys = payload.public_keys.as_ref().map(|raw_vec| {
        raw_vec
            .iter()
            .enumerate()
            .filter_map(|(i, v)| normalize_public_key(i as u32, v))
            .collect::<Vec<IdentityPublicKey>>()
    });
    // 3. Derive public key IDs for quick lookup
    let pk_ids = normalized_public_keys
        .as_ref()
        .map(|v| v.iter().map(|pk| pk.id).collect::<Vec<u32>>());
    // 4. Construct IdentityData
    let identity = IdentityData {
        username: payload
            .username
            .clone()
            .unwrap_or_else(|| payload.identity_id.clone()),
        identity_id: payload.identity_id.clone(),
        identity_idx: payload.identity_idx.unwrap_or(0),
        balance: payload.balance.clone(),
        is_authenticated: true,
        public_keys: normalized_public_keys,
        revision: revision_u64,
        created_at: Some(
            payload
                .created_at
                .clone()
                .unwrap_or_else(|| Utc::now().to_rfc3339()),
        ),
        public_key_ids: pk_ids,
    };
    // 5. Load existing map, update, and save
    let mut map = load_identity_map_internal(&app, &network)?;
    map.insert(payload.identity_id.clone(), identity);
    save_identity_map_internal(&app, &network, &map, payload.active_identity_id)?;
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
pub async fn load_identities_map(app: AppHandle, network: String) -> Result<IdentityMap, String> {
    load_identity_map_internal(&app, &network)
}
#[tauri::command]
pub async fn delete_identity_data(
    app: AppHandle,
    network: String,
    identity_id: Option<String>,
) -> Result<bool, String> {
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "identity")?;
    if let Some(id) = identity_id {
        let mut map = load_identity_map_internal(&app, &network)?;
        if map.remove(&id).is_some() {
            save_identity_map_internal(&app, &network, &map, None)?;
            Ok(true)
        } else {
            Ok(false)
        }
    } else {
        // Delete the whole file/key if no specific ID provided
        match manager.delete(filename, "identities") {
            Ok(_) => Ok(true),
            Err(e) => Err(e.to_string()),
        }
    }
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
    // 1. Load Identity to match keys against
    let map = load_identity_map_internal(&app, &network)?;
    let identity = map
        .get(&identity_id)
        .ok_or("Identity not found in local storage")?;
    // 2. Load Keystore
    let mut store = load_keystore_internal(&app, &network)?;
    let entries = store.identities.get_mut(&identity_id).ok_or(format!(
        "No private keys found for identity {}",
        identity_id
    ))?;
    let mut updated = 0;
    // 3. Iterate through local private keys
    for entry in entries.iter_mut() {
        // A. Derive public key if missing
        if entry.public_key.is_empty() {
            if let Some(pub_hex) = derive_compressed_pubkey_hex_from_wif(&entry.private_key) {
                entry.public_key = pub_hex;
                updated += 1;
            }
        }
        // B. Match local key against on-chain data to enrich Purpose/SecurityLevel
        if !entry.public_key.is_empty() {
            let pub_bytes = hex::decode(&entry.public_key).unwrap_or_default();
            let hash160 = hash160_hex(&pub_bytes);
            if let Some(pks) = &identity.public_keys {
                for pk in pks {
                    let matches_full = pk.data.eq_ignore_ascii_case(&entry.public_key);
                    let matches_hash160 = pk.data.eq_ignore_ascii_case(&hash160);
                    if matches_full || matches_hash160 {
                        entry.purpose = pk.purpose;
                        entry.security_level = pk.security_level;
                        // Ensure key_id alignment
                        entry.key_id = pk.id;
                    }
                }
            }
        }
    }
    // 4. Save Keystore
    save_keystore_internal(&app, &network, &store)?;
    Ok(UnifiedCommandResult {
        success: true,
        error: None,
        payload: Some(serde_json::json!({ "updatedCount": updated })),
    })
}
#[tauri::command]
pub async fn load_private_keys(
    app: AppHandle,
    network: String,
) -> Result<Option<PrivateKeyStore>, String> {
    Ok(Some(load_keystore_internal(&app, &network)?))
}
#[tauri::command]
pub async fn save_private_keys(
    app: AppHandle,
    identity_id: String,
    keys: Vec<PrivateKeyEntry>,
    network: String,
) -> Result<bool, String> {
    let mut store = load_keystore_internal(&app, &network)?;
    let entries = store.identities.entry(identity_id).or_default();
    for k in keys {
        if let Some(existing) = entries.iter_mut().find(|e| e.key_id == k.key_id) {
            *existing = k;
        } else {
            entries.push(k);
        }
    }
    save_keystore_internal(&app, &network, &store)?;
    Ok(true)
}
#[tauri::command]
pub async fn delete_private_keys(
    app: AppHandle,
    network: String,
    identity_id: Option<String>,
) -> Result<bool, String> {
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "safu")?;
    if let Some(id) = identity_id {
        let mut store = load_keystore_internal(&app, &network)?;
        if store.identities.remove(&id).is_some() {
            save_keystore_internal(&app, &network, &store)?;
            Ok(true)
        } else {
            Ok(false)
        }
    } else {
        match manager.delete(filename, "keystore") {
            Ok(_) => Ok(true),
            Err(e) => Err(e.to_string()),
        }
    }
}
#[tauri::command]
pub async fn save_single_identity_keys(
    app: AppHandle,
    identity_id: String,
    key: PrivateKeyEntry,
    network: String,
) -> Result<bool, String> {
    save_private_keys(app, identity_id, vec![key], network).await
}
// =====================================================
// Internal Logic Helpers
// =====================================================
fn load_identity_map_internal(app: &AppHandle, network: &str) -> Result<IdentityMap, String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "identity")?;

    println!("[Rust] Reading identity file: {}", filename);

    if let Ok(Some(val)) = manager.load::<JsonValue>(filename.clone(), "identities") {
        if let Some(obj) = val.as_object() {
            let mut identity_map = HashMap::new();

            for (key, value) in obj {
                // SKIP METADATA
                if key.starts_with("__") {
                    continue;
                }

                // Attempt to parse actual identity data
                if let Ok(identity_data) = serde_json::from_value::<IdentityData>(value.clone()) {
                    identity_map.insert(key.clone(), identity_data);
                } else {
                    println!("[Rust] Skipping invalid identity entry for key: {}", key);
                }
            }

            println!(
                "[Rust] Successfully loaded {} identities",
                identity_map.len()
            );
            return Ok(identity_map);
        }
    }

    // Fallback: Legacy / Empty
    Ok(HashMap::new())
}
fn save_identity_map_internal(
    app: &AppHandle,
    network: &str,
    map: &IdentityMap,
    active_marker: Option<String>,
) -> Result<(), String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "identity")?;
    // Convert map to JsonValue to inject metadata
    let mut output_value = serde_json::to_value(map).map_err(|e| e.to_string())?;
    if let JsonValue::Object(ref mut map_obj) = output_value {
        // Inject active marker if provided
        if let Some(marker) = active_marker {
            map_obj.insert(
                "__active_identity_id".to_string(),
                JsonValue::String(marker),
            );
        }
    }
    manager
        .save(filename, "identities", &output_value)
        .map_err(|e| e.to_string())
}
fn normalize_public_key(default_id: u32, raw: &JsonValue) -> Option<IdentityPublicKey> {
    let obj = raw.as_object()?;
    let data = if let Some(d) = obj.get("data").and_then(|v| v.as_str()) {
        d.to_string()
    } else if let Some(b64) = obj.get("dataB64").and_then(|v| v.as_str()) {
        let bytes = general_purpose::STANDARD.decode(b64).ok()?;
        hex::encode(bytes)
    } else {
        return None;
    };
    let purpose = match obj.get("purpose") {
        Some(JsonValue::Number(n)) => n.as_u64().unwrap_or(0) as u32,
        Some(JsonValue::String(s)) => match s.to_uppercase().as_str() {
            "AUTHENTICATION" => 0,
            "ENCRYPTION" => 1,
            "DECRYPTION" => 2,
            "TRANSFER" => 3,
            _ => 0,
        },
        _ => 0,
    };
    let security_level = match obj.get("securityLevel") {
        Some(JsonValue::Number(n)) => n.as_u64().unwrap_or(0) as u32,
        Some(JsonValue::String(s)) => match s.to_uppercase().as_str() {
            "MASTER" => 0,
            "CRITICAL" => 1,
            "HIGH" => 2,
            "MEDIUM" => 3,
            "LOW" => 4,
            _ => 0,
        },
        _ => 0,
    };
    Some(IdentityPublicKey {
        id: obj
            .get("id")
            .and_then(|v| v.as_u64())
            .map(|n| n as u32)
            .unwrap_or(default_id),
        type_: obj
            .get("type")
            .or(obj.get("keyType"))
            .and_then(|v| v.as_str())
            .unwrap_or("UNKNOWN")
            .to_string(),
        purpose,
        security_level,
        data,
        read_only: obj
            .get("readOnly")
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        disabled_at: obj
            .get("disabledAt")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    })
}
fn derive_compressed_pubkey_hex_from_wif(wif: &str) -> Option<String> {
    let pk = PrivateKey::from_wif(wif).ok()?;
    let secp = Secp256k1::new();
    Some(hex::encode(pk.public_key(&secp).inner.serialize()))
}
fn hash160_hex(data: &[u8]) -> String {
    let sha = Sha256::digest(data);
    let ripe = Ripemd160::digest(sha);
    hex::encode(ripe)
}
fn load_keystore_internal(app: &AppHandle, network: &str) -> Result<PrivateKeyStore, String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "safu")?;
    Ok(manager
        .load::<PrivateKeyStore>(filename, "keystore")
        .map_err(|e| e.to_string())?
        .unwrap_or_default())
}
fn save_keystore_internal(
    app: &AppHandle,
    network: &str,
    store: &PrivateKeyStore,
) -> Result<(), String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "safu")?;
    manager
        .save(filename, "keystore", store)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save_identity_data(
    app: AppHandle,
    network: String,
    identity: IdentityData,
) -> Result<bool, String> {
    let mut map = load_identity_map_internal(&app, &network)?;
    map.insert(identity.identity_id.clone(), identity);
    save_identity_map_internal(&app, &network, &map, None)?;
    Ok(true)
}

#[tauri::command]
pub async fn save_imported_key(
    app: AppHandle,
    identity_id: String,
    key_id: u32,
    private_key_hex: String,
    network: String,
) -> Result<bool, String> {
    let mut store = load_keystore_internal(&app, &network)?;
    let entries = store.identities.entry(identity_id.clone()).or_default();

    // 1. Derive Public Key for the entry
    let pub_hex = derive_compressed_pubkey_hex_from_wif(&private_key_hex)
        .ok_or("Invalid private key format")?;

    let new_entry = PrivateKeyEntry {
        identity_id: identity_id.clone(),
        key_id,
        private_key: private_key_hex,
        public_key: pub_hex,
        purpose: 0, // Placeholder: will be enriched by enrich_keystore_for_identity
        security_level: 0, // Placeholder
        key_type: "ECDSA_HASH160".into(),
        created_at: Utc::now().to_rfc3339(),
        last_used: Utc::now().to_rfc3339(),
        derived_from_mnemonic: Some(false),
    };

    // Replace if exists, else push
    if let Some(existing) = entries.iter_mut().find(|e| e.key_id == key_id) {
        *existing = new_entry;
    } else {
        entries.push(new_entry);
    }

    save_keystore_internal(&app, &network, &store)?;

    // Auto-enrich to align purpose/security level with the identity file
    let _ = enrich_keystore_for_identity(app, network, identity_id).await;

    Ok(true)
}
