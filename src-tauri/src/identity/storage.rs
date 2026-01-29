// src-tauri/src/identity/storage.rs

use crate::identity::lib::IdentityMap;
use crate::models::{IdentityData, PrivateKeyStore};
use crate::utils::{network_file::get_network_file, StoreManager};
use serde_json::Value;
use std::collections::HashMap;
use tauri::AppHandle;

/// Load the identity map from disk
pub fn load_identity_map(app: &AppHandle, network: &str) -> Result<IdentityMap, String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "identity")?;

    if let Ok(Some(val)) = manager.load::<Value>(filename, "identities") {
        if let Some(obj) = val.as_object() {
            let mut identity_map = HashMap::new();
            for (key, value) in obj {
                if key.starts_with("__") { continue; }
                if let Ok(identity_data) = serde_json::from_value::<IdentityData>(value.clone()) {
                    identity_map.insert(key.clone(), identity_data);
                }
            }
            return Ok(identity_map);
        }
    }
    Ok(HashMap::new())
}

/// Save the identity map to disk
pub fn save_identity_map(
    app: &AppHandle,
    network: &str,
    map: &IdentityMap,
    active_marker: Option<String>,
) -> Result<(), String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "identity")?;
    let mut output_value = serde_json::to_value(map).map_err(|e| e.to_string())?;
    if let Value::Object(ref mut map_obj) = output_value {
        if let Some(marker) = active_marker {
            map_obj.insert("__active_identity_id".to_string(), Value::String(marker));
        }
    }
    manager.save(filename, "identities", &output_value).map_err(|e| e.to_string())
}

/// Load the keystore from disk
pub fn load_keystore(app: &AppHandle, network: &str) -> Result<PrivateKeyStore, String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "safu")?;
    Ok(manager
        .load::<PrivateKeyStore>(filename, "keystore")
        .map_err(|e| e.to_string())?
        .unwrap_or_default())
}

/// Save the keystore to disk
pub fn save_keystore(app: &AppHandle, network: &str, store: &PrivateKeyStore) -> Result<(), String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "safu")?;
    manager.save(filename, "keystore", store).map_err(|e| e.to_string())
}
