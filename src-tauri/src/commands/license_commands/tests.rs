// src-tauri/src/commands/license_commands/tests.rs

use super::*;
use serde_json::Value;
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

#[test]
fn test_license_lifecycle_pure() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };
    let identity_id = "test_identity_id".to_string();

    let license = ILicense {
        success: true,
        identity_id: identity_id.clone(),
        txid: "test_tx_id".into(),
        is_premium: true,
        created_at: "1700000000".into(),
        expires_at: "2000000000".into(),
        updated_at: None,
    };

    save_license_logic(&store, license.clone()).expect("Failed to save license");

    let loaded = load_license_logic(&store, identity_id.clone())
        .expect("Failed to load license");

    assert!(loaded.is_some());
    assert_eq!(loaded.unwrap().identity_id, identity_id);

    let _ = delete_license_logic(&store, identity_id.clone());
    let final_load = load_license_logic(&store, identity_id).unwrap();
    assert!(final_load.is_none());
}
