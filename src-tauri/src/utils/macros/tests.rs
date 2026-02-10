// src-tauri/src/utils/macros/tests.rs

use serde::{Serialize, Deserialize};
use specta::Type;
use std::sync::Mutex;
use std::collections::HashMap;
use crate::utils::{PersistentStore, StoreError};

#[derive(Serialize, Deserialize, Clone, Debug, Default, Type, PartialEq)]
pub struct MacroTestPayload {
    pub key: String,
}

struct MockStore {
    storage: Mutex<HashMap<String, serde_json::Value>>,
}

impl PersistentStore for MockStore {
    fn load_value(&self, _path: &str, key: &str) -> Result<Option<serde_json::Value>, StoreError> {
        let map = self.storage.lock().unwrap();
        Ok(map.get(key).cloned())
    }
    fn save_value(&self, _path: &str, key: &str, val: serde_json::Value) -> Result<(), StoreError> {
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
fn test_macro_logic_isolation() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };
    let payload = MacroTestPayload { key: "macro_value".into() };
    let file = "test.json";
    let key = "test_key";

    // Directly test the logic the macro intends to perform
    store.save_data(file, key, &payload).unwrap();
    let loaded: MacroTestPayload = store.load_data(file, key).unwrap().unwrap();
    assert_eq!(loaded, payload);

    store.delete_value(file, key).unwrap();
    let final_load: Option<MacroTestPayload> = store.load_data(file, key).unwrap();
    assert!(final_load.is_none());
}
