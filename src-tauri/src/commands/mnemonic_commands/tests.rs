// src-tauri/src/commands/mnemonic_commands/tests.rs

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
fn test_mnemonic_storage_lifecycle_pure() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };
    let network = "testnet".to_string();
    let phrase = "test mnemonic phrase".to_string();
    let mnemonic_payload = IMnemonic {
        seed_phrase: phrase.clone()
    };
    // Use _logic version to stay independent of AppHandle
    let _ = save_mnemonic_logic(&store, network.clone(), mnemonic_payload.clone());
    let load_res = load_mnemonic_logic(&store, network.clone()).unwrap();
    assert_eq!(load_res, Some(mnemonic_payload));
    let _ = delete_mnemonic_logic(&store, network.clone());
    let final_load = load_mnemonic_logic(&store, network.clone()).unwrap();
    assert!(final_load.is_none());
}
