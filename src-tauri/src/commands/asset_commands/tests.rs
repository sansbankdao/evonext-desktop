// src-tauri/src/commands/asset_commands/tests.rs

use super::*;
use crate::models::IAssetDefinition;
use crate::utils::{PersistentStore, StoreError};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;

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
fn test_parse_assets_snapshot_regression() {
    let mock_api_items = vec![json!({
        "identifier": "DUSD_ID",
        "decimals": 6,
        "balance": "1500000",
        "localizations": { "en": { "singularForm": "Dashpool USD" } }
    })];
    let assets = parse_assets_from_json(&mock_api_items, "identity_123", "testnet");
    assert_eq!(assets.len(), 1);
    assert_eq!(assets[0].symbol, "Dashpool USD");
    assert_eq!(assets[0].balance, Some("1500000".to_string()));
}

#[test]
fn test_assets_command_storage_cycle_pure() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let id = "test_id".to_string();
    let net = "testnet".to_string();

    let assets = vec![IAssetDefinition {
        identity_id: id.clone(),
        name: "Dash".into(),
        symbol: "DASH".into(),
        balance: Some("100".into()),
        asset_id: Some("id1".into()),
        decimals: Some(8),
        network: Some(net.clone()),
    }];

    // Test storage logic without tauri runtime
    let save_res = save_assets_logic(&store, id.clone(), net.clone(), assets);
    assert!(save_res.is_ok());

    let loaded = load_assets_logic(&store, id.clone(), net.clone()).unwrap();
    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded[0].symbol, "DASH");

    let _ = delete_assets_logic(&store, net.clone());
    let final_load = load_assets_logic(&store, id.clone(), net.clone()).unwrap();
    assert_eq!(final_load.len(), 0);
}
