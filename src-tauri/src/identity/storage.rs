// src-tauri/src/identity/storage.rs

use crate::identity::lib::IdentityMap;
use crate::models::{IIdentityData, IPrivateKeyStore};
use crate::utils::{network_file::get_network_file, StoreManager};
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};

pub fn load_identity_map<R: Runtime>(
    app: &AppHandle<R>,
    network: &str
) -> Result<IdentityMap, String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "identity")?;

    if let Ok(Some(val)) = manager.load::<Value>(filename, "identities") {
        if let Some(obj) = val.as_object() {
            let mut identity_map = HashMap::new();
            for (key, value) in obj {
                if key.starts_with("__") { continue; }
                match serde_json::from_value::<IIdentityData>(value.clone()) {
                    Ok(identity_data) => {
                        identity_map.insert(key.clone(), identity_data);
                    }
                    Err(e) => {
                        eprintln!("RECOGNIZED REGRESSION: Identity {} corrupted or model mismatch: {}", key, e);
                    }
                }
            }
            return Ok(identity_map);
        }
    }
    Ok(HashMap::new())
}

pub fn save_identity_map<R: Runtime>(
    app: &AppHandle<R>,
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

pub fn load_keystore<R: Runtime>(
    app: &AppHandle<R>,
    network: &str
) -> Result<IPrivateKeyStore, String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "safu")?;
    Ok(manager
        .load::<IPrivateKeyStore>(filename, "keystore")
        .map_err(|e| e.to_string())?
        .unwrap_or_default())
}

pub fn save_keystore<R: Runtime>(
    app: &AppHandle<R>,
    network: &str,
    store: &IPrivateKeyStore
) -> Result<(), String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "safu")?;
    manager.save(filename, "keystore", store).map_err(|e| e.to_string())
}
