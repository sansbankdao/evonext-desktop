// src-tauri/src/commands/identity_commands/tests.rs

use super::*;
use serde_json::{json, Value};
use std::sync::Mutex;
use std::collections::HashMap;
use crate::utils::{PersistentStore, StoreError};

struct MockStore {
    storage: Mutex<HashMap<String, Value>>,
}

impl PersistentStore for MockStore {
    fn load_value(&self, _path: &str, key: &str) -> Result<Option<Value>, StoreError> {
        let map = self.storage.lock().unwrap();
        Ok(map.get(key).cloned())
    }
    fn save_value(&self, _path: &str, key: &str, val: Value) -> Result<(), StoreError> {
        let mut map = self.storage.lock().unwrap();
        map.insert(key.to_string(), val);
        Ok(())
    }
    fn delete_value(&self, _path: &str, key: &str) -> Result<(), StoreError> {
        let mut map = self.storage.lock().unwrap();
        map.remove(key);
        Ok(())
    }
}

#[tokio::test]
async fn test_save_identity_with_keys_atomic_pure() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };
    let network = "testnet".to_string();
    let identity_id = "atomic_id".to_string();

    let payload = ISaveIdentityPayload {
        identity_id: identity_id.clone(),
        username: "atomic_user".into(),
        balance: "777".into(),
        revision: 2,
        ..Default::default()
    };

    let keys = vec![IPrivateKeyEntry {
        identity_id: identity_id.clone(),
        key_id: 0,
        private_key: "wif_secret".into(),
        ..Default::default()
    }];

    // Test saving
    let res = save_identity_with_keys_logic(
        &store,
        network.clone(),
        payload,
        keys
    ).await.unwrap();

    assert!(res.success);

    // Verify Mapping
    let identity_map = storage::load_identity_map_internal(&store, &network).unwrap();
    assert!(identity_map.contains_key(&identity_id));

    // Verify Keystore
    let keystore = storage::load_keystore_internal(&store, &network).unwrap();
    assert!(keystore.identities.contains_key(&identity_id));
}

#[test]
fn test_identity_mapper_discovery_regression_pure() {
    let payload = ISaveIdentityPayload {
        identity_id: "test_id".into(),
        username: "user".into(),
        balance: "100".into(),
        public_keys: vec![IAnyValue(json!({ "id": 0, "data": "A1B2", "type": "ECDSA_SECP256K1" }))],
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert_eq!(result.identity_id, "test_id");
    assert_eq!(result.public_keys.len(), 1);
}
