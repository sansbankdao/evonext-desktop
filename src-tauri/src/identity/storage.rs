// src-tauri/src/identity/storage.rs

use crate::identity::lib::IdentityMap;
use crate::models::{IIdentityData, IPrivateKeyStore, IDiscoveredIdentitiesStore};
use crate::utils::{get_network_file, StoreManager, PersistentStore};
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};

#[cfg(test)]
mod tests;

pub fn process_raw_identity_map(val: Value) -> IdentityMap {
    let mut identity_map = HashMap::new();
    if let Some(obj) = val.as_object() {
        for (key, value) in obj {
            if key.starts_with("__") { continue; }
            match serde_json::from_value::<IIdentityData>(value.clone()) {
                Ok(identity_data) => { identity_map.insert(key.clone(), identity_data); }
                Err(e) => { eprintln!("RECOGNIZED REGRESSION: Identity {} corrupted: {}", key, e); }
            }
        }
    }
    identity_map
}

pub(crate) fn load_identity_map_internal(store: &impl PersistentStore, network: &str) -> Result<IdentityMap, String> {
    let filename = get_network_file(network, "identity")?;
    match store.load_value(&filename, "identities") {
        Ok(Some(val)) => Ok(process_raw_identity_map(val)),
        Ok(None) => Ok(HashMap::new()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn load_identity_map<R: Runtime>(app: &AppHandle<R>, network: &str) -> Result<IdentityMap, String> {
    let manager = StoreManager::new(app);
    load_identity_map_internal(&manager, network)
}

pub(crate) fn save_identity_map_internal(store: &impl PersistentStore, network: &str, map: &IdentityMap, active_marker: Option<String>) -> Result<(), String> {
    let filename = get_network_file(network, "identity")?;
    let mut output_value = serde_json::to_value(map).map_err(|e| e.to_string())?;
    if let Value::Object(ref mut map_obj) = output_value {
        if let Some(marker) = active_marker {
            map_obj.insert("__active_identity_id".to_string(), Value::String(marker));
        }
    }
    store.save_value(&filename, "identities", output_value).map_err(|e| e.to_string())
}

pub fn save_identity_map<R: Runtime>(app: &AppHandle<R>, network: &str, map: &IdentityMap, active_marker: Option<String>) -> Result<(), String> {
    let manager = StoreManager::new(app);
    save_identity_map_internal(&manager, network, map, active_marker)
}

pub fn load_discovered_identities<R: Runtime>(app: &AppHandle<R>, network: &str) -> Result<IDiscoveredIdentitiesStore, String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "discovered")?;
    match manager.load_value(&filename, "discovery_results") {
        Ok(Some(val)) => serde_json::from_value(val).map_err(|e| e.to_string()),
        Ok(None) => Ok(IDiscoveredIdentitiesStore::default()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn save_discovered_identities<R: Runtime>(app: &AppHandle<R>, network: &str, data: &IDiscoveredIdentitiesStore) -> Result<(), String> {
    let manager = StoreManager::new(app);
    let filename = get_network_file(network, "discovered")?;
    let val = serde_json::to_value(data).map_err(|e| e.to_string())?;
    manager.save_value(&filename, "discovery_results", val).map_err(|e| e.to_string())
}

pub(crate) fn load_keystore_internal(store: &impl PersistentStore, network: &str) -> Result<IPrivateKeyStore, String> {
    let filename = get_network_file(network, "safu")?;
    match store.load_value(&filename, "keystore") {
        Ok(Some(val)) => serde_json::from_value(val).map_err(|e| e.to_string()),
        Ok(None) => Ok(IPrivateKeyStore::default()),
        Err(e) => Err(e.to_string()),
    }
}

pub fn load_keystore<R: Runtime>(app: &AppHandle<R>, network: &str) -> Result<IPrivateKeyStore, String> {
    let manager = StoreManager::new(app);
    load_keystore_internal(&manager, network)
}

pub(crate) fn save_keystore_internal(store: &impl PersistentStore, network: &str, keystore: &IPrivateKeyStore) -> Result<(), String> {
    let filename = get_network_file(network, "safu")?;
    let val = serde_json::to_value(keystore).map_err(|e| e.to_string())?;
    store.save_value(&filename, "keystore", val).map_err(|e| e.to_string())
}

pub fn save_keystore<R: Runtime>(app: &AppHandle<R>, network: &str, store: &IPrivateKeyStore) -> Result<(), String> {
    let manager = StoreManager::new(app);
    save_keystore_internal(&manager, network, store)
}
