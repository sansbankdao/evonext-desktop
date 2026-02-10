// src-tauri/src/identity/storage/tests.rs

use super::*;
use crate::models::{IIdentityData, IPrivateKeyStore};
use crate::utils::{PersistentStore, StoreError};
use serde_json::{json, Value};
use std::cell::RefCell;
use std::collections::HashMap;
/// A manual mock of PersistentStore with named fields and correct trait signatures.
struct MockStore { data: RefCell<HashMap<(String, String), Value>>,
    should_fail: bool,
}
impl MockStore {
    fn new() -> Self {
        Self { data: RefCell::new(HashMap::new()),
            should_fail: false,
        }
    }
    fn with_error() -> Self {
        Self { data: RefCell::new(HashMap::new()),
            should_fail: true,
        }
    }
}
impl PersistentStore for MockStore {
    fn load_value(&self, file_path: &str, key: &str) -> Result<Option<Value>, StoreError> {
        if self.should_fail {
            return Err(StoreError::Store("Mock Error".to_string()));
        }
        let storage = self.data.borrow();
        Ok(storage.get(&(file_path.to_string(), key.to_string())).cloned())
    }
    fn save_value(&self, file_path: &str, key: &str, value: Value) -> Result<(), StoreError> {
        if self.should_fail {
            return Err(StoreError::Store("Mock Error".to_string()));
        }
        let mut storage = self.data.borrow_mut();
        storage.insert((file_path.to_string(), key.to_string()), value);
        Ok(())
    }
    fn delete_value(&self, _file_path: &str, _key: &str) -> Result<(), StoreError> {
        if self.should_fail {
            return Err(StoreError::Store("Mock Error".to_string()));
        }
        Ok(())
    }
}
#[test]
fn test_process_raw_identity_map_filters_metadata() {
    let input = json!({
        "id_1": {
            "identityId": "id_1",
            "username": "tester",
            "balance": "0",
            "publicKeys": [],
            "isAuthenticated": false
        },
        "__active_identity_id": "id_1"
    });
    let map = process_raw_identity_map(input);
    // Keys starting with __ are skipped by the loop in storage.rs
    assert!(map.contains_key("id_1"));
    assert!(!map.contains_key("__active_identity_id"));
}
#[test]
fn test_handling_malformed_identities() {
    let input = json!({
        "valid_id": {
            "identityId": "valid_id",
            "username": "tester",
            "balance": "0",
            "publicKeys": [],
            "isAuthenticated": true
        },
        "corrupted_id": "not-an-object"
    });
    let map = process_raw_identity_map(input);
    assert_eq!(map.len(), 1);
    assert!(map.contains_key("valid_id"));
}
#[test]
fn test_identity_storage_roundtrip_logic() {
    let store = MockStore::new();
    let network = "testnet";
    let mut map = HashMap::new();
    let data = IIdentityData {
        identity_id: "test_id".to_string(),
        username: "test_user".to_string(),
        balance: "100.5".to_string(),
        ..Default::default()
    };
    map.insert("test_id".to_string(), data);
    save_identity_map_internal(&store, network, &map, Some("test_id".to_string()))
        .expect("Save failed");
    let loaded_map = load_identity_map_internal(&store, network)
        .expect("Load failed");
    assert_eq!(loaded_map.len(), 1);
    assert!(loaded_map.contains_key("test_id"));
    assert_eq!(loaded_map.get("test_id").unwrap().username, "test_user");
}
#[test]
fn test_keystore_storage_logic() {
    let store = MockStore::new();
    let network = "mainnet";
    let keystore = IPrivateKeyStore::default();
    save_keystore_internal(&store, network, &keystore).expect("Save failed");
    let loaded = load_keystore_internal(&store, network).expect("Load failed");
    assert_eq!(loaded, keystore);
}
#[test]
fn test_load_empty_store_returns_defaults() {
    let store = MockStore::new();
    let network = "mainnet";
    let identities = load_identity_map_internal(&store, network).unwrap();
    let keystore = load_keystore_internal(&store, network).unwrap();
    assert!(identities.is_empty());
    assert_eq!(keystore, IPrivateKeyStore::default());
}
#[test]
fn test_storage_errors_propagate() {
    let store = MockStore::with_error();
    let network = "mainnet";
    assert!(load_identity_map_internal(&store, network).is_err());
    assert!(load_keystore_internal(&store, network).is_err());
}
#[test]
fn test_process_raw_identity_map_skips_internal_keys() {
    let input = json!({
        "__active": "true",
        "__version": 1,
        "actual_id": {
            "identityId": "actual_id",
            "username": "user",
            "balance": "0",
            "publicKeys": [],
            "isAuthenticated": false
        }
    });
    let map = process_raw_identity_map(input);
    assert_eq!(map.len(), 1);
    assert!(map.contains_key("actual_id"));
}
