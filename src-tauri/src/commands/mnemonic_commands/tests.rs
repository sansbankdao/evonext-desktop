// src-tauri/src/commands/mnemonic_commands/tests.rs

use super::*;
use crate::models::IPrivateKeyEntry;
use crate::utils::{PersistentStore, StoreError};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;

struct MockStore {
    storage: Mutex<HashMap<String, Value>>,
}

struct FailingStore;

impl PersistentStore for FailingStore {
    fn load_value(&self, _path: &str, _key: &str) -> Result<Option<Value>, StoreError> {
        Err(StoreError::Store("simulated failure".to_string()))
    }
    fn save_value(&self, _path: &str, _key: &str, _val: Value) -> Result<(), StoreError> {
        Err(StoreError::Store("simulated failure".to_string()))
    }
    fn delete_value(&self, _path: &str, _key: &str) -> Result<(), StoreError> {
        Err(StoreError::Store("simulated failure".to_string()))
    }
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
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();
    let phrase = "test mnemonic phrase".to_string();
    let mnemonic_payload = IMnemonic {
        seed_phrase: phrase.clone(),
    };
    // Use _logic version to stay independent of AppHandle
    let _ = save_mnemonic_logic(&store, network.clone(), mnemonic_payload.clone());
    let load_res = load_mnemonic_logic(&store, network.clone()).unwrap();
    assert_eq!(load_res, Some(mnemonic_payload));
    let _ = delete_mnemonic_logic(&store, network.clone());
    let final_load = load_mnemonic_logic(&store, network.clone()).unwrap();
    assert!(final_load.is_none());
}

// =====================================================
// NEW TESTS: mnemonic edge cases
// =====================================================

#[test]
fn test_load_mnemonic_empty_store() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = load_mnemonic_logic(&store, "testnet".into()).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_load_mnemonic_invalid_network() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = load_mnemonic_logic(&store, "invalid_net".into());
    assert!(result.is_err());
}

#[test]
fn test_save_mnemonic_invalid_network() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let mnemonic = IMnemonic {
        seed_phrase: "test phrase".into(),
    };
    let result = save_mnemonic_logic(&store, "invalid_net".into(), mnemonic);
    assert!(result.is_err());
}

#[test]
fn test_delete_mnemonic_empty_store() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    // Deleting from empty store should return Ok (no keystore found => early return)
    let result = delete_mnemonic_logic(&store, "testnet".into());
    assert!(result.is_ok());
}

#[test]
fn test_delete_mnemonic_invalid_network() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = delete_mnemonic_logic(&store, "invalid_net".into());
    assert!(result.is_err());
}

#[test]
fn test_save_mnemonic_overwrites_existing() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    let m1 = IMnemonic {
        seed_phrase: "first phrase".into(),
    };
    save_mnemonic_logic(&store, network.clone(), m1).unwrap();

    let m2 = IMnemonic {
        seed_phrase: "second phrase".into(),
    };
    save_mnemonic_logic(&store, network.clone(), m2).unwrap();

    let loaded = load_mnemonic_logic(&store, network).unwrap().unwrap();
    assert_eq!(loaded.seed_phrase, "second phrase");
}

#[test]
fn test_save_mnemonic_preserves_keystore_identities() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    // Seed the keystore with identity keys first
    let mut keystore = IPrivateKeyStore::default();
    keystore.identities.insert(
        "some_id".into(),
        vec![IPrivateKeyEntry {
            identity_id: "some_id".into(),
            key_id: 0,
            private_key: "wif".into(),
            ..Default::default()
        }],
    );
    let filename = crate::utils::network_file::get_network_file(&network, "safu").unwrap();
    store.save_data(filename, "keystore", &keystore).unwrap();

    // Save mnemonic
    let mnemonic = IMnemonic {
        seed_phrase: "my phrase".into(),
    };
    save_mnemonic_logic(&store, network.clone(), mnemonic).unwrap();

    // Verify both mnemonic and identities survive
    let loaded: IPrivateKeyStore = store.load_data(filename, "keystore").unwrap().unwrap();
    assert!(loaded.mnemonic.is_some());
    assert_eq!(loaded.mnemonic.unwrap().seed_phrase, "my phrase");
    assert!(loaded.identities.contains_key("some_id"));
}

#[test]
fn test_delete_mnemonic_preserves_keystore_identities() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    // Seed keystore with both mnemonic and identity keys
    let mut keystore = IPrivateKeyStore::default();
    keystore.mnemonic = Some(IMnemonic {
        seed_phrase: "to be deleted".into(),
    });
    keystore.identities.insert(
        "some_id".into(),
        vec![IPrivateKeyEntry {
            identity_id: "some_id".into(),
            key_id: 0,
            private_key: "wif".into(),
            ..Default::default()
        }],
    );
    let filename = crate::utils::network_file::get_network_file(&network, "safu").unwrap();
    store.save_data(filename, "keystore", &keystore).unwrap();

    // Delete mnemonic
    delete_mnemonic_logic(&store, network.clone()).unwrap();

    // Verify mnemonic is gone but identities remain
    let loaded: IPrivateKeyStore = store.load_data(filename, "keystore").unwrap().unwrap();
    assert!(loaded.mnemonic.is_none());
    assert!(loaded.identities.contains_key("some_id"));
}

#[test]
fn test_load_mnemonic_mainnet() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let mnemonic = IMnemonic {
        seed_phrase: "mainnet phrase".into(),
    };
    save_mnemonic_logic(&store, "mainnet".into(), mnemonic.clone()).unwrap();

    let loaded = load_mnemonic_logic(&store, "mainnet".into()).unwrap();
    assert_eq!(loaded, Some(mnemonic));
}

// =====================================================
// NEW TESTS: mnemonic error propagation
// =====================================================

#[test]
fn test_load_mnemonic_store_error() {
    let store = FailingStore;
    let result = load_mnemonic_logic(&store, "testnet".into());
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("simulated failure"));
}

#[test]
fn test_save_mnemonic_store_error() {
    let store = FailingStore;
    let mnemonic = IMnemonic {
        seed_phrase: "phrase".into(),
    };
    let result = save_mnemonic_logic(&store, "testnet".into(), mnemonic);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("simulated failure"));
}

#[test]
fn test_delete_mnemonic_store_error() {
    let store = FailingStore;
    let result = delete_mnemonic_logic(&store, "testnet".into());
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("simulated failure"));
}

// =====================================================
// NEW TESTS: mnemonic with malformed keystore data
// =====================================================

#[test]
fn test_load_mnemonic_malformed_keystore() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    // Store malformed data
    store
        .save_value("", "keystore", serde_json::json!("not a keystore object"))
        .unwrap();

    // load_mnemonic_logic calls load_data which will fail to deserialize
    let result = load_mnemonic_logic(&store, "testnet".into());
    assert!(result.is_err());
}

#[test]
fn test_save_mnemonic_with_malformed_existing_keystore() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    // Store malformed data — save_mnemonic_logic should handle gracefully
    // by falling back to default keystore
    store
        .save_value("", "keystore", serde_json::json!("bad data"))
        .unwrap();

    let mnemonic = IMnemonic {
        seed_phrase: "recovery phrase".into(),
    };
    let result = save_mnemonic_logic(&store, "testnet".into(), mnemonic);
    assert!(result.is_ok());

    // The new mnemonic should be saved with a fresh default keystore
    let loaded = load_mnemonic_logic(&store, "testnet".into()).unwrap();
    assert!(loaded.is_some());
    assert_eq!(loaded.unwrap().seed_phrase, "recovery phrase");
}

// =====================================================
// NEW TESTS: mnemonic edge cases with seed phrase content
// =====================================================

#[test]
fn test_save_and_load_mnemonic_empty_seed_phrase() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let mnemonic = IMnemonic {
        seed_phrase: "".into(),
    };
    save_mnemonic_logic(&store, "testnet".into(), mnemonic).unwrap();
    let loaded = load_mnemonic_logic(&store, "testnet".into())
        .unwrap()
        .unwrap();
    assert_eq!(loaded.seed_phrase, "");
}

#[test]
fn test_save_and_load_mnemonic_long_seed_phrase() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let long_phrase = "word ".repeat(24);
    let mnemonic = IMnemonic {
        seed_phrase: long_phrase.clone(),
    };
    save_mnemonic_logic(&store, "testnet".into(), mnemonic).unwrap();
    let loaded = load_mnemonic_logic(&store, "testnet".into())
        .unwrap()
        .unwrap();
    assert_eq!(loaded.seed_phrase, long_phrase);
}
