// src-tauri/src/commands/identity_details_commands/tests.rs

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
fn test_identity_details_missing_identity_pure() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };
    let res = update_identity_with_sdk_data_logic(
        &store,
        "testnet".into(),
        "non_existent".into(),
        vec![],
        1,
        vec![]
    );
    assert!(res.is_err());
    assert!(res.unwrap_err().contains("not found"));
}
