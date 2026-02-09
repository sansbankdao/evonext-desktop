// src-tauri/src/identity/storage/tests.rs

use super::*;
use crate::models::{IIdentityData, IPrivateKeyStore, IPrivateKeyEntry};
use crate::utils::{StoreError, PersistentStore};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;
/// A mock implementation of the PersistentStore trait for unit testing.
struct MockStore {
    pub data: Mutex<HashMap<String, Value>>,
}
impl MockStore {
    fn new() -> Self {
        Self {
            data: Mutex::new(HashMap::new()),
        }
    }
}
impl PersistentStore for MockStore {
    fn load_value(&self, filename: &str, key: &str) -> Result<Option<Value>, StoreError> {
        let storage_key = format!("{}:{}", filename, key);
        let data = self.data.lock().unwrap();
        Ok(data.get(&storage_key).cloned())
    }
    fn save_value(&self, filename: &str, key: &str, value: Value) -> Result<(), StoreError> {
        let storage_key = format!("{}:{}", filename, key);
        let mut data = self.data.lock().unwrap();
        data.insert(storage_key, value);
        Ok(())
    }
}
#[test]
fn test_process_raw_identity_map_filters_metadata() {
    let raw_json = json!({
        "__active_identity_id": "user_active",
        "user_valid": {
            "identityId": "user_valid",
            "username": "tester",
            "balance": "1000",
            "revision": 1,
            "publicKeys": [],
            "isAuthenticated": true
        }
    });
    let map = process_raw_identity_map(raw_json);
    assert_eq!(map.len(), 1);
    assert!(map.contains_key("user_valid"));
    assert!(!map.contains_key("__active_identity_id"));
}
#[test]
fn test_identity_storage_roundtrip_logic() {
    let store = MockStore::new();
    let network = "testnet";
    let identity_id = "alice_id".to_string();
    let mut map = HashMap::new();
    map.insert(identity_id.clone(), IIdentityData {
        identity_id: identity_id.clone(),
        username: "alice".to_string(),
        balance: "50".to_string(),
        revision: 2,
        public_keys: vec![],
        identity_idx: Some(0),
        dpns_username: None,
        is_authenticated: true,
        created_at: None,
        public_key_ids: None,
    });
    save_identity_map_internal(&store, network, &map, Some(identity_id.clone())).unwrap();
    let loaded_map = load_identity_map_internal(&store, network).unwrap();
    assert_eq!(loaded_map.len(), 1);
    assert_eq!(loaded_map.get(&identity_id).unwrap().username, "alice");
    let filename = get_network_file(network, "identity").unwrap();
    let raw_val = store.load_value(&filename, "identities").unwrap().unwrap();
    assert_eq!(raw_val["__active_identity_id"], json!(identity_id));
}
#[test]
fn test_keystore_storage_logic() {
    let store = MockStore::new();
    let network = "testnet";
    let mut keystore = IPrivateKeyStore::default();
    let entry = IPrivateKeyEntry {
        identity_id: "id_123".to_string(),
        key_id: 1,
        purpose: 0,
        security_level: 0,
        key_type: "ECDSA_SECP256K1".to_string(),
        private_key: "private_key_data".to_string(),
        public_key: "public_key_data".to_string(),
        // derived_from_mnemonic: Some(true),
        created_at: "2024-01-01T00:00:00Z".to_string(),
        last_used: "2024-01-01T00:00:00Z".to_string(),
    };
    keystore.identities.insert("id_123".to_string(), vec![entry]);
    save_keystore_internal(&store, network, &keystore).unwrap();
    let loaded = load_keystore_internal(&store, network).unwrap();
    assert!(loaded.identities.contains_key("id_123"));
    assert_eq!(
        loaded.identities.get("id_123").unwrap()[0].private_key,
        "private_key_data"
    );
}
#[test]
fn test_handling_malformed_identities() {
    let raw_json = json!({
        "good_one": {
            "identityId": "good_one",
            "username": "bob",
            "balance": "1",
            "revision": 1,
            "publicKeys": [],
            "isAuthenticated": true
        },
        "bad_one": {
            "invalid_field": true
        }
    });
    let map = process_raw_identity_map(raw_json);
    assert_eq!(map.len(), 1);
    assert!(map.contains_key("good_one"));
    assert!(!map.contains_key("bad_one"));
}
