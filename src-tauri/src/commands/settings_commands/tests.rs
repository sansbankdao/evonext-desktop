// src-tauri/src/commands/settings_commands/tests.rs

use super::*;
use crate::models::{INotificationSettings, IProfileSettings};
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

fn create_mock_settings() -> IAppSettings {
    IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: Some("test-id".to_string()),
    }
}

#[test]
fn test_settings_lifecycle_pure() {
    // No mock_builder()! This test is now CI safe.
    let store = MockStore { storage: Mutex::new(HashMap::new()) };
    let settings = create_mock_settings();

    // 1. Test Save
    save_settings_logic(&store, settings.clone()).expect("Failed to save");

    // 2. Test Load
    let load_res = load_settings_logic(&store).unwrap();
    assert!(load_res.is_some());
    assert_eq!(load_res.unwrap().theme, "dark");

    // 3. Test Delete
    let _ = delete_settings_logic(&store);

    // 4. Verify None
    let final_load = load_settings_logic(&store).unwrap();
    assert!(final_load.is_none());
}
