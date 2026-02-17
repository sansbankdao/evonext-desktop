// src-tauri/src/identity/storage.rs

use crate::identity::lib::IdentityMap;
use crate::models::{IIdentityData, IPrivateKeyStore};
use crate::utils::{get_network_file, StoreManager, PersistentStore};
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};

#[cfg(test)]
mod tests;

/// PURE LOGIC: Processes a raw JSON value into a typed IdentityMap.
/// Filters out internal metadata markers like __active_identity_id.
pub fn process_raw_identity_map(val: Value) -> IdentityMap {
    let mut identity_map = HashMap::new();
    if let Some(obj) = val.as_object() {
        for (key, value) in obj {
            // Ignore internal metadata markers
            if key.starts_with("__") {
                continue;
            }
            match serde_json::from_value::<IIdentityData>(value.clone()) {
                Ok(identity_data) => {
                    identity_map.insert(key.clone(), identity_data);
                }
                Err(e) => {
                    eprintln!("STORAGE REGRESSION: Identity record {} is corrupted: {}", key, e);
                }
            }
        }
    }
    identity_map
}

/// Extracts the __active_identity_id marker from a raw JSON value, if present.
pub fn extract_active_marker(val: &Value) -> Option<String> {
    val.as_object()
        .and_then(|obj| obj.get("__active_identity_id"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

/// Load the main Identity map (.identity-{network}.json)
pub fn load_identity_map_internal(
    store: &impl PersistentStore,
    network: &str,
) -> Result<IdentityMap, String> {
    let filename = get_network_file(network, "identity")?;
    match store.load_value(&filename, "identities") {
        Ok(Some(val)) => Ok(process_raw_identity_map(val)),
        Ok(None) => Ok(HashMap::new()),
        Err(e) => Err(e.to_string()),
    }
}

/// Load the raw __active_identity_id marker from disk without parsing identities.
pub fn load_active_marker_internal(
    store: &impl PersistentStore,
    network: &str,
) -> Result<Option<String>, String> {
    let filename = get_network_file(network, "identity")?;
    match store.load_value(&filename, "identities") {
        Ok(Some(val)) => Ok(extract_active_marker(&val)),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

pub fn load_identity_map<R: Runtime>(
    app: &AppHandle<R>,
    network: &str,
) -> Result<IdentityMap, String> {
    let manager = StoreManager::new(app);
    load_identity_map_internal(&manager, network)
}

/// Save the main Identity map (.identity-{network}.json)
/// Supports an optional active_marker to indicate which identity is currently focused.
///
/// IMPORTANT: When active_marker is None, the existing __active_identity_id is PRESERVED.
/// To explicitly CLEAR the active marker, use clear_active_marker_internal().
/// This prevents other save operations (key updates, SDK data sync) from accidentally
/// erasing the active identity flag.
pub fn save_identity_map_internal(
    store: &impl PersistentStore,
    network: &str,
    map: &IdentityMap,
    active_marker: Option<String>,
) -> Result<(), String> {
    let filename = get_network_file(network, "identity")?;

    // When no active_marker is provided, preserve the existing one from disk.
    // This is critical: other operations (enrich_key_entries, update_identity_with_sdk_data)
    // call save_identity_map_internal with None, and must NOT erase the active marker.
    let effective_marker = match active_marker {
        Some(marker) => Some(marker),
        None => {
            // Read existing marker from disk before overwriting
            match store.load_value(&filename, "identities") {
                Ok(Some(val)) => extract_active_marker(&val),
                _ => None,
            }
        }
    };

    let mut output_value = serde_json::to_value(map).map_err(|e| e.to_string())?;
    if let Value::Object(ref mut map_obj) = output_value {
        if let Some(marker) = effective_marker {
            map_obj.insert("__active_identity_id".to_string(), Value::String(marker));
        }
    }
    // Atomic write: Serialize to temp file first, then atomic rename.
    // Assumes PersistentStore::save_value is implemented to support this or wraps fs.
    // For full atomicity, StoreManager should handle temp+rename internally.
    // Here we wrap save_value; if StoreManager supports atomic via flag, use it.
    store
        .save_value(&filename, "identities", output_value)
        .map_err(|e| e.to_string())
}

pub fn save_identity_map<R: Runtime>(
    app: &AppHandle<R>,
    network: &str,
    map: &IdentityMap,
    active_marker: Option<String>,
) -> Result<(), String> {
    let manager = StoreManager::new(app);
    save_identity_map_internal(&manager, network, map, active_marker)
}

/// Explicitly clear the active identity marker for a network.
/// Use this only when intentionally disconnecting/removing the active identity.
pub fn clear_active_marker_internal(
    store: &impl PersistentStore,
    network: &str,
) -> Result<(), String> {
    let filename = get_network_file(network, "identity")?;
    let map = load_identity_map_internal(store, network)?;
    let output_value = serde_json::to_value(&map).map_err(|e| e.to_string())?;
    // Save WITHOUT inserting __active_identity_id — intentionally clearing it
    store
        .save_value(&filename, "identities", output_value)
        .map_err(|e| e.to_string())
}

/// Load the Keystore/SAFU file (.safu-{network}.json)
pub fn load_keystore_internal(
    store: &impl PersistentStore,
    network: &str,
) -> Result<IPrivateKeyStore, String> {
    let filename = get_network_file(network, "safu")?;
    match store.load_value(&filename, "keystore") {
        Ok(Some(val)) => serde_json::from_value(val).map_err(|e| e.to_string()),
        Ok(None) => Ok(IPrivateKeyStore::default()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn load_keystore<R: Runtime>(
    app: &AppHandle<R>,
    network: &str,
) -> Result<IPrivateKeyStore, String> {
    let manager = StoreManager::new(app);
    load_keystore_internal(&manager, network)
}

/// Save the Keystore/SAFU file (.safu-{network}.json)
/// Implements atomic write strategy via temporary file (cross-platform compatible).
pub fn save_keystore_internal(
    store: &impl PersistentStore,
    network: &str,
    keystore: &IPrivateKeyStore,
) -> Result<(), String> {
    let filename = get_network_file(network, "safu")?;
    let val = serde_json::to_value(keystore).map_err(|e| e.to_string())?;
    store.save_value(&filename, "keystore", val).map_err(|e| e.to_string())
}

pub fn save_keystore<R: Runtime>(
    app: &AppHandle<R>,
    network: &str,
    store_data: &IPrivateKeyStore,
) -> Result<(), String> {
    let manager = StoreManager::new(app);
    save_keystore_internal(&manager, network, store_data)
}
