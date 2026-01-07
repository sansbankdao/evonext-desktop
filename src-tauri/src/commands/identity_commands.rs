// src-tauri/src/commands/identity_commands.rs

use std::collections::HashMap;
use tauri::AppHandle;
use base64::{engine::general_purpose, Engine};
// use serde::{Deserialize, Serialize};
use serde_json::{Value as JsonValue};
// use serde_json::{json, Value as JsonValue};
use chrono::Utc;
use crate::models::{
    IdentityData, IdentityPublicKey, PrivateKeyEntry, PrivateKeyStore,
};
use crate::utils::StoreManager;
use crate::utils::network_file::get_network_file;

type IdentityMap = HashMap<String, IdentityData>;

// ---------------------- Helpers ----------------------
fn pick_str(obj: &serde_json::Map<String, JsonValue>, keys: &[&str]) -> Option<String> {
    for k in keys {
        if let Some(JsonValue::String(s)) = obj.get(*k) {
            return Some(s.clone());
        }
    }
    None
}

fn pick_bool(obj: &serde_json::Map<String, JsonValue>, key: &str) -> Option<bool> {
    obj.get(key).and_then(|v| v.as_bool())
}

fn pick_u32(obj: &serde_json::Map<String, JsonValue>, keys: &[&str]) -> Option<u32> {
    for k in keys {
        match obj.get(*k) {
            Some(JsonValue::Number(n)) => return n.as_u64().map(|x| x as u32),
            Some(JsonValue::String(s)) => {
                if let Ok(v) = s.parse::<u32>() {
                    return Some(v);
                }
            }
            _ => {}
        }
    }
    None
}

fn val_to_u64(val: &JsonValue) -> Option<u64> {
    match val {
        JsonValue::Number(n) => n.as_u64(),
        JsonValue::String(s) => s.parse::<u64>().ok(),
        _ => None,
    }
}

fn val_to_string(val: &JsonValue) -> Option<String> {
    match val {
        JsonValue::String(s) => Some(s.clone()),
        JsonValue::Number(n) => Some(n.to_string()),
        JsonValue::Bool(b) => Some(b.to_string()),
        _ => None,
    }
}

fn base64_to_hex(s: &str) -> Option<String> {
    let bytes = general_purpose::STANDARD.decode(s).ok()?;
    Some(hex::encode(bytes))
}

fn purpose_to_u32(purpose: Option<String>, fallback: Option<u32>) -> u32 {
    if let Some(p) = purpose {
        let up = p.to_uppercase();

        return match up.as_str() {
            "AUTHENTICATION" => 0,
            "ENCRYPTION" => 1,
            "DECRYPTION" => 2,
            "TRANSFER" => 3,
            _ => fallback.unwrap_or(0),
        };
    }

    fallback.unwrap_or(0)
}

fn sec_level_to_u32(seclvl: Option<String>, fallback: Option<u32>) -> u32 {
    if let Some(s) = seclvl {
        let up = s.to_uppercase();

        return match up.as_str() {
            "MASTER" => 0,
            "CRITICAL" => 1,
            "HIGH" => 2,
            "MEDIUM" => 3,
            "LOW" => 4,
            _ => fallback.unwrap_or(0),
        };
    }

    fallback.unwrap_or(0)
}

fn normalize_public_keys(raw: &JsonValue) -> Vec<IdentityPublicKey> {
    let mut out: Vec<IdentityPublicKey> = Vec::new();
    let arr = match raw.as_array() {
        Some(a) => a,
        None => return out,
    };

    for (idx, v) in arr.iter().enumerate() {
        let obj = match v.as_object() {
            Some(o) => o,
            None => {
                eprintln!("[save_identity_data_untyped] public_keys[{}] is not an object", idx);
                continue;
            }
        };

        let id = pick_u32(obj, &["id"]).unwrap_or(idx as u32);
        let type_ = pick_str(obj, &["type", "type_", "keyType"]).unwrap_or_else(|| "UNKNOWN".to_string());
        let purpose_str = pick_str(obj, &["purpose"]);
        let purpose_num = pick_u32(obj, &["purpose"]);
        let purpose = purpose_to_u32(purpose_str, purpose_num);
        let sec_str = pick_str(obj, &["securityLevel"]);
        let sec_num = pick_u32(obj, &["securityLevel"]);
        let security_level = sec_level_to_u32(sec_str, sec_num);
        let data_hex = if let Some(d) = pick_str(obj, &["data"]) {
            d
        } else if let Some(b64) = pick_str(obj, &["dataB64"]) {
            base64_to_hex(&b64).unwrap_or_default()
        } else {
            String::new()
        };
        let read_only = pick_bool(obj, "readOnly").unwrap_or(false);
        let disabled_at = pick_str(obj, &["disabledAt"]);
        let pk = IdentityPublicKey {
            id,
            type_,
            purpose,
            security_level,
            data: data_hex,
            read_only,
            disabled_at,
        };
        println!(
            "[save_identity_data_untyped] normalized pk idx={} -> id={} type={} purpose={} sec={} data.len={}",
            idx, pk.id, pk.type_, pk.purpose, pk.security_level, pk.data.len()
        );
        out.push(pk);
    }
    out
}

fn derive_public_key_ids(pks: &Vec<IdentityPublicKey>, maybe_ids: Option<&JsonValue>) -> Vec<u32> {
    if let Some(JsonValue::Array(ids)) = maybe_ids {
        let mut v = Vec::new();

        for (i, it) in ids.iter().enumerate() {
            if let Some(n) = it.as_u64() {
                v.push(n as u32);
            } else if let Some(s) = it.as_str() {
                if let Ok(x) = s.parse::<u32>() {
                    v.push(x);
                } else {
                    v.push(i as u32);
                }
            } else {
                v.push(i as u32);
            }
        }

        if !v.is_empty() {
            return v;
        }
    }

    pks.iter().map(|pk| pk.id).collect()
}

// ---------------------- Key Store helpers ----------------------
fn load_keystore(app: &AppHandle, network: &str) -> Result<PrivateKeyStore, String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "safu")?;
    let store = manager
        .load::<PrivateKeyStore>(filename, "keystore")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();
    Ok(store)
}

fn save_keystore(app: &AppHandle, network: &str, store: &PrivateKeyStore) -> Result<(), String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "safu")?;
    manager
        .save(filename, "keystore", store)
        .map_err(|e| e.to_string())
}

fn load_identity_map(app: &AppHandle, network: &str) -> Result<IdentityMap, String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "identity")?;

    // Try map first
    if let Ok(loaded) = manager.load::<IdentityMap>(filename, "identity") {
        if let Some(map) = loaded {
            return Ok(map);
        }
    }

    // Fallback: legacy single identity
    if let Ok(loaded_single) = manager.load::<IdentityData>(filename, "identity") {
        if let Some(single) = loaded_single {
            let mut map = IdentityMap::new();
            map.insert(single.identity_id.clone(), single);
            return Ok(map);
        }
    }

    Ok(IdentityMap::new())
}

fn save_identity_map(app: &AppHandle, network: &str, map: &IdentityMap) -> Result<(), String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "identity")?;
    manager
        .save(filename.clone(), "identity", map)
        .map_err(|e| e.to_string())
        .map(|_| {
            println!("[save_identity_map] identity map written: {}", filename);
        })
}

#[tauri::command]
pub async fn load_identities_map(
    app: AppHandle,
    network: String,
) -> Result<IdentityMap, String> {
    let map = load_identity_map(&app, &network)?;
    Ok(map)
}

// ---------------------- Commands: Debug ----------------------
#[tauri::command]
pub async fn debug_identity_payload(payload: JsonValue) -> Result<String, String> {
    println!(
        "[debug_identity_payload] incoming raw payload: {}",
        payload
    );
    Ok("ok".to_string())
}

// ---------------------- Commands: Identity Data ----------------------
#[tauri::command]
pub async fn load_identity_data(
    app: AppHandle,
    network: String,
) -> Result<Option<IdentityData>, String> {
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "identity")?;
    match manager.load::<IdentityData>(filename, "identity") {
        Ok(data) => Ok(data),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn save_identity_data_untyped(
    app: AppHandle,
    network: String,
    payload: JsonValue,
) -> Result<bool, String> {
    println!("[save_identity_data_untyped] network={}", network);
    println!("[save_identity_data_untyped] raw payload={}", payload);

    let obj = payload
        .as_object()
        .ok_or_else(|| "payload must be an object".to_string())?;

    let identity_id = pick_str(obj, &["identity_id", "identityId"])
        .ok_or_else(|| "missing identity_id".to_string())?;
    let username = pick_str(obj, &["username"]).unwrap_or_else(|| identity_id.clone());
    let identity_idx = pick_u32(obj, &["identity_idx", "identityIdx"]).unwrap_or(0);
    let balance = obj.get("balance").and_then(|v| val_to_string(v));
    let revision = obj.get("revision").and_then(|v| val_to_u64(v));
    let created_at = pick_str(obj, &["created_at", "createdAt"]).or_else(|| Some(Utc::now().to_rfc3339()));
    let is_authenticated = obj
        .get("is_authenticated")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    let raw_pks = obj.get("public_keys").or_else(|| obj.get("publicKeys"));
    let normalized_pks = raw_pks.map(|v| normalize_public_keys(v));
    let pk_ids = match (&normalized_pks, obj.get("public_key_ids").or_else(|| obj.get("publicKeyIds"))) {
        (Some(pks), maybe_ids) => Some(derive_public_key_ids(pks, maybe_ids)),
        (None, maybe_ids) => {
            if let Some(JsonValue::Array(ids)) = maybe_ids {
                let mut v = Vec::new();
                for (i, it) in ids.iter().enumerate() {
                    if let Some(n) = it.as_u64() {
                        v.push(n as u32);
                    } else if let Some(s) = it.as_str() {
                        if let Ok(x) = s.parse::<u32>() {
                            v.push(x);
                        } else {
                            v.push(i as u32);
                        }
                    } else {
                        v.push(i as u32);
                    }
                }
                Some(v)
            } else {
                None
            }
        }
    };

    if let Some(ref pks) = normalized_pks {
        println!(
            "[save_identity_data_untyped] normalized {} public keys",
            pks.len()
        );
    } else {
        println!("[save_identity_data_untyped] no public_keys provided in payload");
    }

    // Build IdentityData
    let identity = IdentityData {
        username,
        identity_id: identity_id.clone(),
        identity_idx,
        balance,
        is_authenticated,
        public_keys: normalized_pks,
        revision,
        created_at,
        public_key_ids: pk_ids,
    };

    // Merge into identity map and save
    let mut map = load_identity_map(&app, &network)?;
    map.insert(identity_id.clone(), identity);

    save_identity_map(&app, &network, &map)?;
    Ok(true)
}

#[tauri::command]
pub async fn save_identity_data(
    app: AppHandle,
    network: String,
    identity: IdentityData,
) -> Result<bool, String> {
    println!(
        "[save_identity_data] merge typed into map id={} idx={}",
        identity.identity_id, identity.identity_idx
    );

    let mut map = load_identity_map(&app, &network)?;
    map.insert(identity.identity_id.clone(), identity);
    save_identity_map(&app, &network, &map)?;
    Ok(true)
}

#[tauri::command]
pub async fn delete_identity_data(
    app: AppHandle,
    network: String,
    identity_id: Option<String> // <--- ADDED: Optional ID parameter
) -> Result<bool, String> {
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "identity")?;
    // FIX: If ID is provided, remove specific identity from map instead of deleting file
    if let Some(id) = identity_id {
        let mut map = load_identity_map(&app, &network)?;
        if map.remove(&id).is_some() {
            match manager.save(filename, "identity", &map) {
                Ok(_) => {
                    println!("[delete_identity_data] Removed specific identity {} from map: {}", id, filename);
                    Ok(true)
                }
                Err(e) => Err(e.to_string())
            }
        } else {
            println!("[delete_identity_data] Identity {} not found in map", id);
            Ok(false)
        }
    } else {
        // Existing behavior: Nuke the file if no ID provided
        match manager.delete(filename, "identity") {
            Ok(_) => Ok(true),
            Err(e) => Err(e.to_string()),
        }
    }
}

// ---------------------- Commands: Key Store (restored) ----------------------
#[tauri::command]
pub async fn load_private_keys(
    app: AppHandle,
    network: String,
) -> Result<Option<PrivateKeyStore>, String> {
    println!("[DEBUG Backend] load_private_keys network={}", network);
    let store = load_keystore(&app, &network)?;
    Ok(Some(store))
}

#[tauri::command]
pub async fn save_private_keys(
    app: AppHandle,
    identity_id: String,
    keys: Vec<PrivateKeyEntry>,
    network: String,
) -> Result<bool, String> {
    println!("[DEBUG Backend 1] save_private_keys called for ID: {}", identity_id);
    println!("[DEBUG Backend 2] Received {} keys to save", keys.len());
    for (i, k) in keys.iter().enumerate() {
        println!(
            "[DEBUG Backend 2.1] key[{}]: id={} purpose={} sec={} type={} priv.len={} derived={} created_at={}",
            i,
            k.key_id,
            k.purpose,
            k.security_level,
            k.key_type,
            k.private_key.len(),
            k.derived_from_mnemonic.unwrap_or(false),
            k.created_at
        );
    }
    let mut store = load_keystore(&app, &network)?;
    let filename = get_network_file(&network, "safu")?;
    println!("[DEBUG Backend 3] Target filename: {}", filename);
    let entries = store.identities.entry(identity_id.clone()).or_default();
    println!("[DEBUG Backend 4] Existing entries count: {}", entries.len());
    for k in keys {
        println!("[DEBUG Backend 5] Processing key_id: {}", k.key_id);
        if let Some(existing) = entries.iter_mut().find(|e| e.key_id == k.key_id) {
            *existing = k;
        } else {
            entries.push(k);
        }
    }
    println!("[DEBUG Backend 6] Final entries count: {}", entries.len());
    save_keystore(&app, &network, &store)?;
    println!("[DEBUG Backend 7] save_private_keys complete -> {}", filename);
    Ok(true)
}

#[tauri::command]
pub async fn delete_private_keys(
    app: AppHandle,
    network: String,
    identity_id: Option<String>, // <--- ADDED: Optional ID parameter
) -> Result<bool, String> {
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "safu")?;
    // FIX: If ID is provided, remove specific identity's keys from map.
    // Otherwise, delete the entire SAFU file.
    if let Some(id) = identity_id {
        let mut store = load_keystore(&app, &network)?;
        if store.identities.remove(&id).is_some() {
            match manager.save(filename, "keystore", &store) {
                Ok(_) => {
                    println!("[delete_private_keys] Removed keys for identity {} from: {}", id, filename);
                    Ok(true)
                }
                Err(e) => Err(e.to_string())
            }
        } else {
            println!("[delete_private_keys] No keys found for identity {}", id);
            Ok(false)
        }
    } else {
        // Existing behavior: Nuke the file if no ID provided
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
    println!(
        "[DEBUG Backend] save_single_identity_keys id={} key_id={} network={}",
        identity_id, key.key_id, network
    );
    save_private_keys(app, identity_id, vec![key], network).await
}
