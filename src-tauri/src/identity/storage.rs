// src-tauri/src/identity/storage.rs

use crate::identity::lib::IdentityMap;
use crate::models::{IIdentityData, IPrivateKeyStore};
use crate::utils::{get_network_file, StoreManager, PersistentStore, StoreError};
use serde_json::Value;
use std::collections::HashMap;
use tauri::{AppHandle, Runtime};
/// PURE LOGIC: Processes a raw JSON value into a typed IdentityMap
pub fn process_raw_identity_map(val: Value) -> IdentityMap {
    let mut identity_map = HashMap::new();
    if let Some(obj) = val.as_object() {
        for (key, value) in obj {
            if key.starts_with("__") {
                continue;
            }
            match serde_json::from_value::<IIdentityData>(value.clone()) {
                Ok(identity_data) => {
                    identity_map.insert(key.clone(), identity_data);
                }
                Err(e) => {
                    eprintln!(
                        "RECOGNIZED REGRESSION: Identity {} corrupted or model mismatch: {}",
                        key, e
                    );
                }
            }
        }
    }
    identity_map
}
/// INTERNAL: Handles map loading using a Generic Store
fn load_identity_map_internal(
    store: &impl PersistentStore,
    network: &str,
) -> Result<IdentityMap, String> {
    let filename = get_network_file(network, "identity")?;
    match store.load_value(filename, "identities") {
        Ok(Some(val)) => Ok(process_raw_identity_map(val)),
        Ok(None) => Ok(HashMap::new()),
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
    manager
        .save_value(filename, "identities", output_value)
        .map_err(|e| e.to_string())
}
/// INTERNAL: Handles keystore loading using a Generic Store
fn load_keystore_internal(
    store: &impl PersistentStore,
    network: &str,
) -> Result<IPrivateKeyStore, String> {
    let filename = get_network_file(network, "safu")?;
    match store.load_value(filename, "keystore") {
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
/// INTERNAL: Handles keystore saving using a Generic Store
fn save_keystore_internal(
    store: &impl PersistentStore,
    network: &str,
    keystore: &IPrivateKeyStore,
) -> Result<(), String> {
    let filename = get_network_file(network, "safu")?;
    let val = serde_json::to_value(keystore).map_err(|e| e.to_string())?;
    store.save_value(filename, "keystore", val).map_err(|e| e.to_string())
}
pub fn save_keystore<R: Runtime>(
    app: &AppHandle<R>,
    network: &str,
    store: &IPrivateKeyStore,
) -> Result<(), String> {
    let manager = StoreManager::new(app);
    save_keystore_internal(&manager, network, store)
}
#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    struct MockStore {
        data: Option<Value>,
    }
    impl PersistentStore for MockStore {
        fn load_value(&self, _: &str, _: &str) -> Result<Option<Value>, StoreError> {
            Ok(self.data.clone())
        }
        fn save_value(&self, _: &str, _: &str, _: Value) -> Result<(), StoreError> {
            Ok(())
        }
    }
    #[test]
    fn test_process_raw_identity_map_skips_metadata() {
        let raw = json!({
            "__active_identity_id": "id1",
            "user_1": {
                "identityId": "user_1",
                "username": "alice",
                "balance": "100",
                "revision": 1,
                "publicKeys": [],
                "isAuthenticated": true
            }
        });
        let map = process_raw_identity_map(raw);
        assert_eq!(map.len(), 1);
        assert!(map.contains_key("user_1"));
        assert!(!map.contains_key("__active_identity_id"));
    }
    #[test]
    fn test_load_keystore_internal_valid() {
        let raw = json!({
            "mnemonic": { "seedPhrase": "test words" },
            "identities": {}
        });
        let store = MockStore { data: Some(raw) };
        let result = load_keystore_internal(&store, "testnet").unwrap();
        assert_eq!(result.mnemonic.unwrap().seed_phrase, "test words");
    }
    #[test]
    fn test_load_keystore_internal_missing() {
        let store = MockStore { data: None };
        let result = load_keystore_internal(&store, "testnet").unwrap();
        assert!(result.mnemonic.is_none());
    }
    #[test]
    fn test_save_keystore_internal() {
        let store = MockStore { data: None };
        let ks = IPrivateKeyStore::default();
        let result = save_keystore_internal(&store, "testnet", &ks);
        assert!(result.is_ok());
    }
}
