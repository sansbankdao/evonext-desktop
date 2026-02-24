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

// =====================================================
// NEW TESTS: parse_assets_from_json edge cases
// =====================================================

#[test]
fn test_parse_assets_skips_unknown_symbol() {
    // Item without localizations => symbol becomes "UNKNOWN" => skipped
    let items = vec![json!({
        "identifier": "SOME_ID",
        "decimals": 8,
        "balance": "100"
    })];
    let assets = parse_assets_from_json(&items, "id1", "testnet");
    assert_eq!(assets.len(), 0);
}

#[test]
fn test_parse_assets_skips_empty_contract_id() {
    // Has valid symbol but no identifier or dataContractIdentifier => contract_id empty => skipped
    let items = vec![json!({
        "decimals": 8,
        "balance": "100",
        "localizations": { "en": { "singularForm": "ValidToken" } }
    })];
    let assets = parse_assets_from_json(&items, "id1", "testnet");
    assert_eq!(assets.len(), 0);
}

#[test]
fn test_parse_assets_uses_data_contract_identifier() {
    let items = vec![json!({
        "dataContractIdentifier": "CONTRACT_ABC",
        "decimals": 6,
        "balance": "5000",
        "localizations": { "en": { "singularForm": "TestCoin" } }
    })];
    let assets = parse_assets_from_json(&items, "owner1", "mainnet");
    assert_eq!(assets.len(), 1);
    assert_eq!(assets[0].asset_id, Some("CONTRACT_ABC".to_string()));
    assert_eq!(assets[0].symbol, "TestCoin");
    assert_eq!(assets[0].name, "TestCoin");
    assert_eq!(assets[0].identity_id, "owner1");
    assert_eq!(assets[0].network, Some("mainnet".to_string()));
    assert_eq!(assets[0].decimals, Some(6));
    assert_eq!(assets[0].balance, Some("5000".to_string()));
}

#[test]
fn test_parse_assets_default_decimals() {
    // No decimals field => defaults to 8
    let items = vec![json!({
        "identifier": "ID1",
        "balance": "100",
        "localizations": { "en": { "singularForm": "NoDec" } }
    })];
    let assets = parse_assets_from_json(&items, "id1", "testnet");
    assert_eq!(assets.len(), 1);
    assert_eq!(assets[0].decimals, Some(8));
}

#[test]
fn test_parse_assets_missing_balance() {
    // No balance field => defaults to 0
    let items = vec![json!({
        "identifier": "ID1",
        "decimals": 2,
        "localizations": { "en": { "singularForm": "NoBal" } }
    })];
    let assets = parse_assets_from_json(&items, "id1", "testnet");
    assert_eq!(assets.len(), 1);
    assert_eq!(assets[0].balance, Some("0".to_string()));
}

#[test]
fn test_parse_assets_invalid_balance_string() {
    // Non-numeric balance string => parse fails => defaults to 0
    let items = vec![json!({
        "identifier": "ID1",
        "decimals": 8,
        "balance": "not_a_number",
        "localizations": { "en": { "singularForm": "BadBal" } }
    })];
    let assets = parse_assets_from_json(&items, "id1", "testnet");
    assert_eq!(assets.len(), 1);
    assert_eq!(assets[0].balance, Some("0".to_string()));
}

#[test]
fn test_parse_assets_multiple_items_mixed() {
    let items = vec![
        json!({
            "identifier": "ID1",
            "decimals": 8,
            "balance": "100",
            "localizations": { "en": { "singularForm": "CoinA" } }
        }),
        // This one should be skipped (no symbol)
        json!({
            "identifier": "ID2",
            "decimals": 8,
            "balance": "200"
        }),
        json!({
            "dataContractIdentifier": "ID3",
            "decimals": 6,
            "balance": "300",
            "localizations": { "en": { "singularForm": "CoinB" } }
        }),
    ];
    let assets = parse_assets_from_json(&items, "owner", "testnet");
    assert_eq!(assets.len(), 2);
    assert_eq!(assets[0].symbol, "CoinA");
    assert_eq!(assets[1].symbol, "CoinB");
}

#[test]
fn test_parse_assets_empty_items() {
    let items: Vec<Value> = vec![];
    let assets = parse_assets_from_json(&items, "id1", "testnet");
    assert_eq!(assets.len(), 0);
}

// =====================================================
// NEW TESTS: load/save/delete logic additional branches
// =====================================================

#[test]
fn test_load_assets_empty_store() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = load_assets_logic(&store, "nonexistent".into(), "testnet".into()).unwrap();
    assert!(result.is_empty());
}

#[test]
fn test_load_assets_identity_not_in_map() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    // Save assets for one identity
    let assets = vec![IAssetDefinition {
        identity_id: "id_a".into(),
        name: "Coin".into(),
        symbol: "COIN".into(),
        balance: Some("100".into()),
        asset_id: Some("cid".into()),
        decimals: Some(8),
        network: Some("testnet".into()),
    }];
    save_assets_logic(&store, "id_a".into(), "testnet".into(), assets).unwrap();

    // Load for a different identity
    let result = load_assets_logic(&store, "id_b".into(), "testnet".into()).unwrap();
    assert!(result.is_empty());
}

#[test]
fn test_save_assets_overwrites_existing() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let id = "overwrite_id".to_string();
    let net = "testnet".to_string();

    let assets1 = vec![IAssetDefinition {
        identity_id: id.clone(),
        name: "CoinA".into(),
        symbol: "A".into(),
        balance: Some("100".into()),
        asset_id: Some("cid1".into()),
        decimals: Some(8),
        network: Some(net.clone()),
    }];
    save_assets_logic(&store, id.clone(), net.clone(), assets1).unwrap();

    let assets2 = vec![IAssetDefinition {
        identity_id: id.clone(),
        name: "CoinB".into(),
        symbol: "B".into(),
        balance: Some("200".into()),
        asset_id: Some("cid2".into()),
        decimals: Some(6),
        network: Some(net.clone()),
    }];
    save_assets_logic(&store, id.clone(), net.clone(), assets2).unwrap();

    let loaded = load_assets_logic(&store, id.clone(), net.clone()).unwrap();
    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded[0].symbol, "B");
}

#[test]
fn test_save_assets_multiple_identities() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let net = "testnet".to_string();

    let assets_a = vec![IAssetDefinition {
        identity_id: "id_a".into(),
        name: "CoinA".into(),
        symbol: "A".into(),
        balance: Some("100".into()),
        asset_id: Some("cid1".into()),
        decimals: Some(8),
        network: Some(net.clone()),
    }];
    let assets_b = vec![IAssetDefinition {
        identity_id: "id_b".into(),
        name: "CoinB".into(),
        symbol: "B".into(),
        balance: Some("200".into()),
        asset_id: Some("cid2".into()),
        decimals: Some(6),
        network: Some(net.clone()),
    }];

    save_assets_logic(&store, "id_a".into(), net.clone(), assets_a).unwrap();
    save_assets_logic(&store, "id_b".into(), net.clone(), assets_b).unwrap();

    let loaded_a = load_assets_logic(&store, "id_a".into(), net.clone()).unwrap();
    let loaded_b = load_assets_logic(&store, "id_b".into(), net.clone()).unwrap();
    assert_eq!(loaded_a.len(), 1);
    assert_eq!(loaded_b.len(), 1);
    assert_eq!(loaded_a[0].symbol, "A");
    assert_eq!(loaded_b[0].symbol, "B");
}

#[test]
fn test_delete_assets_empty_store() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = delete_assets_logic(&store, "testnet".into());
    assert!(result.is_ok());
}

#[test]
fn test_delete_assets_preserves_other_networks() {
    // The MockStore ignores file paths, so we test by verifying
    // delete only removes the correct network's key.
    // Use separate stores to simulate separate network files.
    let store_testnet = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let store_mainnet = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let assets = vec![IAssetDefinition {
        identity_id: "id1".into(),
        name: "Coin".into(),
        symbol: "C".into(),
        balance: Some("100".into()),
        asset_id: Some("cid".into()),
        decimals: Some(8),
        network: Some("testnet".into()),
    }];

    save_assets_logic(
        &store_testnet,
        "id1".into(),
        "testnet".into(),
        assets.clone(),
    )
    .unwrap();
    save_assets_logic(&store_mainnet, "id1".into(), "mainnet".into(), assets).unwrap();

    // Delete testnet assets
    delete_assets_logic(&store_testnet, "testnet".into()).unwrap();

    // Testnet should be empty
    let loaded_testnet = load_assets_logic(&store_testnet, "id1".into(), "testnet".into()).unwrap();
    assert!(loaded_testnet.is_empty());

    // Mainnet store is untouched
    let loaded_mainnet = load_assets_logic(&store_mainnet, "id1".into(), "mainnet".into()).unwrap();
    assert_eq!(loaded_mainnet.len(), 1);
}

#[test]
fn test_save_assets_invalid_network() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = save_assets_logic(&store, "id".into(), "invalid_net".into(), vec![]);
    assert!(result.is_err());
}

#[test]
fn test_load_assets_invalid_network() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = load_assets_logic(&store, "id".into(), "invalid_net".into());
    assert!(result.is_err());
}

#[test]
fn test_delete_assets_invalid_network() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = delete_assets_logic(&store, "invalid_net".into());
    assert!(result.is_err());
}
