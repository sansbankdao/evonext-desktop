// src-tauri/src/commands/identity_v2.rs
use tauri::AppHandle;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use chrono::Utc;
use crate::models::{IdentityData, IdentityPublicKey, PrivateKeyStore, PrivateKeyEntry};
use crate::utils::StoreManager;
use crate::utils::network_file::get_network_file;
use sha2::Digest as ShaDigest;
use sha2::Sha256;
use ripemd::Ripemd160;
use hex;
use base64::{engine::general_purpose, Engine};
use ts_rs::TS;
// =====================================================
// Public API payload/result (also exported to TS later)
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
    pub revision: Option<JsonValue>,            // number | string | null
    #[ts(type = "unknown[]")]
    pub public_keys: Option<Vec<JsonValue>>,    // tolerant; normalized here
    pub created_at: Option<String>,
    // We want to allow the frontend to pass this to persist the active choice
    #[serde(default)]
    pub active_identity_id: Option<String>,
}
// =====================================================
// Unified entrypoint: save identity (tolerant, normalized)
// =====================================================
#[tauri::command]
pub async fn save_identity_unified(
    app: AppHandle,
    payload: SaveIdentityPayload,
    network: String,
) -> Result<UnifiedCommandResult, String> {
    println!("[Unified] save_identity_unified: network={}", network);
    println!(
        "[Unified] payload={}",
        serde_json::to_string(&payload).unwrap_or_default()
    );
    let revision_u64: Option<u64> = match payload.revision.as_ref() {
        Some(JsonValue::Number(n)) => n.as_u64(),
        Some(JsonValue::String(s)) => s.parse::<u64>().ok(),
        Some(_) => None,
        None => None,
    };
    // Normalize public keys (accepts DAPI-like and our internal shapes)
    let normalized_public_keys = payload
        .public_keys
        .as_ref()
        .map(|raw_vec| {
            raw_vec
                .iter()
                .enumerate()
                .filter_map(|(i, v)| match normalize_public_key(i as u32, v) {
                    Ok(pk) => {
                        println!(
                            "[Unified] normalized pk[{}]: id={} type={} purpose={} secLevel={} data_len={}",
                            i, pk.id, pk.type_, pk.purpose, pk.security_level, pk.data.len()
                        );
                        Some(pk)
                    }
                    Err(e) => {
                        eprintln!("[Unified] normalize_public_key failed at index {}: {}", i, e);
                        None
                    }
                })
                .collect::<Vec<IdentityPublicKey>>()
        });
    let pk_ids = normalized_public_keys
        .as_ref()
        .map(|v| v.iter().map(|pk| pk.id).collect::<Vec<u32>>());
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
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "identity")?;
    // 1. Load existing map as JsonValue to handle Options/Nulls gracefully
    let mut identities_value: JsonValue = match manager.load::<JsonValue>(filename.clone(), "identities") {
        Ok(Some(val)) => val,
        Ok(None) => JsonValue::Object(serde_json::Map::new()),
        Err(_) => JsonValue::Object(serde_json::Map::new()),
    };
    // 2. Insert/Update the new identity into the map
    // We construct the JsonValue for the identity explicitly to avoid borrowing issues
    let identity_value = serde_json::to_value(&identity).map_err(|e| e.to_string())?;
    if let JsonValue::Object(ref mut map) = identities_value {
        map.insert(payload.identity_id.clone(), identity_value);
        // PERSISTENCE FIX: Handle Active Identity Marker
        // If payload contains active_identity_id, we update the metadata key in the map.
        // We ensure this is written to disk.
        if let Some(ref active_id) = payload.active_identity_id {
            if !active_id.is_empty() {
                println!("[Unified] Updating __active_identity_id marker to: {}", active_id);
                map.insert("__active_identity_id".to_string(), JsonValue::String(active_id.clone()));
            }
        }
    } else {
        // Should not happen given logic above, but handle safely
        return Err("Existing identities data was not a JSON Object".to_string());
    }
    // 3. Save the modified map back
    match manager.save(filename.clone(), "identities", &identities_value) {
        Ok(_) => {
            println!(
                "[Unified] identity file written: {} (identities map updated)",
                filename
            );
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
// =====================================================
// NEW: Explicitly update the active identity marker
// =====================================================
#[tauri::command]
pub async fn update_active_identity_marker(
    app: AppHandle,
    network: String,
    active_id: String,
) -> Result<UnifiedCommandResult, String> {
    println!("[Unified] update_active_identity_marker: network={}, id={}", network, active_id);
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "identity")?;
    let mut identities_value: JsonValue = match manager.load::<JsonValue>(filename, "identities") {
        Ok(Some(val)) => val,
        Ok(None) => JsonValue::Object(serde_json::Map::new()),
        Err(e) => {
            eprintln!("[Unified] Error loading identities for marker update: {}", e);
            return Err("Failed to load identities to update marker".to_string());
        }
    };
    if let JsonValue::Object(ref mut map) = identities_value {
        map.insert("__active_identity_id".to_string(), JsonValue::String(active_id));
    }
    match manager.save(filename, "identities", &identities_value) {
        Ok(_) => Ok(UnifiedCommandResult {
            success: true,
            error: None,
            payload: None,
        }),
        Err(e) => {
            let msg = format!("Failed to save active identity marker: {}", e);
            eprintln!("[Unified] {}", msg);
            Ok(UnifiedCommandResult {
                success: false,
                error: Some(msg),
                payload: None,
            })
        }
    }
}
// =====================================================
// Query identity (reads what we saved, no network)
// =====================================================
#[tauri::command]
pub async fn query_and_update_identity(
    app: AppHandle,
    network: String,
    identity_id: String,
) -> Result<UnifiedCommandResult, String> {
    println!(
        "[Unified] query_and_update_identity: network={}, id={}",
        network, identity_id
    );
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "identity")?;
    // Load map as JsonValue
    match manager.load::<JsonValue>(filename, "identities") {
        Ok(Some(JsonValue::Object(map))) => {
            if let Some(data) = map.get(&identity_id) {
                // Return the raw JsonValue object for the identity
                println!(
                    "[Unified] loaded identity: id={}",
                    identity_id
                );
                Ok(UnifiedCommandResult {
                    success: true,
                    error: None,
                    payload: Some(data.clone()),
                })
            } else {
                Ok(UnifiedCommandResult {
                    success: false,
                    error: Some("Identity not found".to_string()),
                    payload: None,
                })
            }
        }
        Ok(_) => Ok(UnifiedCommandResult {
            success: false,
            error: Some("No identities map found".to_string()),
            payload: None,
        }),
        Err(e) => Ok(UnifiedCommandResult {
            success: false,
            error: Some(format!("Failed to load identity: {}", e)),
            payload: None,
        }),
    }
}
// =====================================================
// Enrich keystore: fill publicKey, map to identity keys
// =====================================================
#[tauri::command]
pub async fn enrich_keystore_for_identity(
    app: AppHandle,
    network: String,
    identity_id: String,
) -> Result<UnifiedCommandResult, String> {
    println!(
        "[Unified] enrich_keystore_for_identity: network={}, id={}",
        network, &identity_id
    );
    let manager = StoreManager::new(&app);
    // 1) Load identity map as JsonValue to handle Options
    let identity_file = get_network_file(&network, "identity")?;
    let identity_opt: Option<IdentityData> = match manager.load::<JsonValue>(identity_file.clone(), "identities") {
        Ok(Some(JsonValue::Object(map))) => {
            if let Some(data_val) = map.get(&identity_id) {
                match serde_json::from_value::<IdentityData>(data_val.clone()) {
                    Ok(data) => Some(data),
                    Err(e) => {
                        eprintln!("[Unified] Failed to parse IdentityData from JSON: {}", e);
                        None
                    }
                }
            } else {
                None
            }
        }
        Ok(_) => None,
        Err(_) => None,
    };
    let identity = match identity_opt {
        Some(i) => i,
        None => {
            let msg = "Identity file not found; save identity first".to_string();
            eprintln!("[Unified] {}", msg);
            return Ok(UnifiedCommandResult {
                success: false,
                error: Some(msg),
                payload: None,
            });
        }
    };
    if identity.identity_id != identity_id {
        println!(
            "[Unified] Warning: loaded identity_id {} differs from parameter {}",
            identity.identity_id, identity_id
        );
    }
    let registered = identity.public_keys.clone().unwrap_or_default();
    println!(
        "[Unified] {} registered public keys from identity file",
        registered.len()
    );
    for (idx, pk) in registered.iter().enumerate() {
        println!(
            "[Unified] identity pk[{}]: id={} type={} purpose={} sec={} data[0..8]={}",
            idx,
            pk.id,
            pk.type_,
            pk.purpose,
            pk.security_level,
            &pk.data.chars().take(8).collect::<String>()
        );
    }
    // 2) Load keystore (safu)
    let safu_file = get_network_file(&network, "safu")?;
    let mut keystore = manager
        .load::<PrivateKeyStore>(safu_file.clone(), "keystore")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    let entries = match keystore.identities.get_mut(&identity_id) {
        Some(v) => v,
        None => {
            let msg = format!(
                "No keystore entries for identity {}. Nothing to enrich.",
                identity_id
            );
            println!("[Unified] {}", msg);
            return Ok(UnifiedCommandResult {
                success: true,
                error: None,
                payload: Some(serde_json::json!({ "updated": 0 })),
            });
        }
    };
    // 3) For each keystore entry:
    //    - derive pubkey if empty
    //    - compute HASH160(pubkey)
    //    - try to match to identity's public keys
    let mut updated = 0usize;
    for (i, entry) in entries.iter_mut().enumerate() {
        println!(
            "[Unified] Entry {}: keyId={} hasPubKey={} purpose={} sec={}",
            i,
            entry.key_id,
            !entry.public_key.is_empty(),
            entry.purpose,
            entry.security_level
        );
        if entry.public_key.is_empty() {
            if let Some(pub_hex) = derive_compressed_pubkey_hex_from_wif(&entry.private_key) {
                println!(
                    "[Unified] Derived pubkey for keyId {}: {}",
                    entry.key_id, &pub_hex
                );
                entry.public_key = pub_hex;
                updated += 1;
            } else {
                eprintln!(
                    "[Unified] Failed to derive pubkey from WIF for keyId {}",
                    entry.key_id
                );
            }
        }
        if entry.public_key.is_empty() {
            // Can't hash or match without a public key
            continue;
        }
        let pub_hex = entry.public_key.clone();
        let pub_bytes = match hex::decode(&pub_hex) {
            Ok(b) => b,
            Err(e) => {
                eprintln!(
                    "[Unified] Invalid pubkey hex for keyId {}: {} ({})",
                    entry.key_id, pub_hex, e
                );
                continue;
            }
        };
        let hash160_hex = hash160_hex(&pub_bytes);
        println!(
            "[Unified] keyId {} pub_compressed[0..8]={} hash160[0..8]={}",
            entry.key_id,
            &pub_hex.chars().take(8).collect::<String>(),
            &hash160_hex.chars().take(8).collect::<String>()
        );
        // Try to match
        let mut matched = false;
        for (j, pk) in registered.iter().enumerate() {
            let key_type = pk.type_.as_str(); // "ECDSA_HASH160" | "ECDSA_SECP256K1"
            let data = pk.data.as_str();      // hex string
            match key_type {
                "ECDSA_SECP256K1" => {
                    if equals_hex_case_insensitive(&pub_hex, data) {
                        println!(
                            "[Unified] Matched SECP256K1 at identity index {} for keyId {}",
                            j, entry.key_id
                        );
                        apply_purpose_security(entry, pk.purpose, pk.security_level);
                        matched = true;
                        break;
                    }
                }
                "ECDSA_HASH160" => {
                    if equals_hex_case_insensitive(&hash160_hex, data) {
                        println!(
                            "[Unified] Matched HASH160 at identity index {} for keyId {}",
                            j, entry.key_id
                        );
                        apply_purpose_security(entry, pk.purpose, pk.security_level);
                        matched = true;
                        break;
                    }
                }
                other => {
                    println!("[Unified] Unsupported key type '{}' at identity index {}", other, j);
                }
            }
        }
        if !matched {
            println!(
                "[Unified] No identity key matched for keystore keyId {} (pub {}, hash160 {})",
                entry.key_id, &pub_hex, &hash160_hex
            );
        }
    }
    // 4) Save keystore back
    match manager.save(safu_file.clone(), "keystore", &keystore) {
        Ok(_) => {
            println!(
                "[Unified] Keystore enriched and saved: {} (updated={})",
                safu_file, updated
            );
            Ok(UnifiedCommandResult {
                success: true,
                error: None,
                payload: Some(serde_json::json!({ "updated": updated })),
            })
        }
        Err(e) => Ok(UnifiedCommandResult {
            success: false,
            error: Some(format!("Failed to save keystore: {}", e)),
            payload: None,
        }),
    }
}
// =====================================================
// Helpers
// =====================================================
fn normalize_public_key(default_id: u32, raw: &JsonValue) -> Result<IdentityPublicKey, String> {
    let obj = raw
        .as_object()
        .ok_or_else(|| "public key not an object".to_string())?;
    let id = match obj.get("id") {
        Some(JsonValue::Number(n)) => n.as_u64().unwrap_or(default_id as u64) as u32,
        Some(JsonValue::String(s)) => s.parse::<u32>().unwrap_or(default_id),
        _ => default_id,
    };
    let type_str =
        pick_string(obj, &["type", "type_", "keyType"]).unwrap_or("UNKNOWN".to_string());
    let purpose_u32 = match pick_string(obj, &["purpose"]).as_deref() {
        Some("AUTHENTICATION") => 0,
        Some("ENCRYPTION") => 1,
        Some("DECRYPTION") => 2,
        Some("TRANSFER") => 3,
        Some(s) => s.parse::<u32>().unwrap_or(0),
        None => match obj.get("purpose") {
            Some(JsonValue::Number(n)) => n.as_u64().unwrap_or(0) as u32,
            _ => 0,
        },
    };
    let security_u32 = match pick_string(obj, &["securityLevel"]).as_deref() {
        Some("MASTER") => 0,
        Some("CRITICAL") => 1,
        Some("HIGH") => 2,
        Some("MEDIUM") => 3,
        Some("LOW") => 4,
        Some(s) => s.parse::<u32>().unwrap_or(0),
        None => match obj.get("securityLevel") {
            Some(JsonValue::Number(n)) => n.as_u64().unwrap_or(0) as u32,
            _ => 0,
        },
    };
    let read_only = match obj.get("readOnly") {
        Some(JsonValue::Bool(b)) => *b,
        _ => false,
    };
    let disabled_at = pick_string(obj, &["disabledAt"]);
    // Prefer hex "data"; fallback to base64 "dataB64"
    let data_hex = if let Some(s) = pick_string(obj, &["data"]) {
        s
    } else if let Some(b64) = pick_string(obj, &["dataB64"]) {
        base64_to_hex(&b64).unwrap_or_default()
    } else {
        "".to_string()
    };
    Ok(IdentityPublicKey {
        id,
        type_: type_str,
        purpose: purpose_u32,
        security_level: security_u32,
        data: data_hex,
        read_only,
        disabled_at,
    })
}
fn pick_string(obj: &serde_json::Map<String, JsonValue>, keys: &[&str]) -> Option<String> {
    for k in keys {
        if let Some(JsonValue::String(s)) = obj.get(*k) {
            return Some(s.clone());
        }
    }
    None
}
fn base64_to_hex(input: &str) -> Option<String> {
    let bytes = base64::engine::general_purpose::STANDARD.decode(input).ok()?;
    Some(hex::encode(bytes))
}
fn hash160_hex(data: &[u8]) -> String {
    let sha = Sha256::digest(data);
    let ripe = Ripemd160::digest(sha);
    hex::encode(ripe)
}
fn equals_hex_case_insensitive(a: &str, b: &str) -> bool {
    a.trim().eq_ignore_ascii_case(b.trim())
}
fn apply_purpose_security(entry: &mut PrivateKeyEntry, purpose: u32, security_level: u32) {
    // Only overwrite if we actually matched the on-chain key
    entry.purpose = purpose;
    entry.security_level = security_level;
}
// Derive compressed secp256k1 public key from WIF private key (bitcoin 0.32)
fn derive_compressed_pubkey_hex_from_wif(wif: &str) -> Option<String> {
    let pk = bitcoin::PrivateKey::from_wif(wif).ok()?;
    let secp = bitcoin::secp256k1::Secp256k1::new();
    // NOTE: pass a reference to the context; then serialize the inner (compressed 33-bytes)
    let secp_pubkey = pk.public_key(&secp).inner;
    let bytes = secp_pubkey.serialize(); // compressed (33 bytes)
    Some(hex::encode(bytes))
}
