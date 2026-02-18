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

#[test]
fn test_save_license_creates_map_if_missing() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let license = ILicense {
        success: true,
        identity_id: "new_identity".to_string(),
        txid: "tx123".to_string(),
        is_premium: false,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    // Save should work even with no existing map
    let result = save_license_logic(&store, license);
    assert!(result.is_ok());

    // Verify it was saved
    let loaded = load_license_logic(&store, "new_identity".to_string()).unwrap();
    assert!(loaded.is_some());
}

#[test]
fn test_load_license_empty_store() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let result = load_license_logic(&store, "any_identity".to_string()).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_load_license_non_existent_identity() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    // Save a license for one identity
    let license = ILicense {
        success: true,
        identity_id: "existing_identity".to_string(),
        txid: "tx1".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    save_license_logic(&store, license).unwrap();

    // Try to load a different identity
    let result = load_license_logic(&store, "non_existent_identity".to_string()).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_save_multiple_licenses() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let license1 = ILicense {
        success: true,
        identity_id: "identity_1".to_string(),
        txid: "tx1".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    let license2 = ILicense {
        success: true,
        identity_id: "identity_2".to_string(),
        txid: "tx2".to_string(),
        is_premium: false,
        created_at: "1700001000".to_string(),
        expires_at: "2000001000".to_string(),
        updated_at: Some("1700002000".to_string()),
    };

    save_license_logic(&store, license1.clone()).unwrap();
    save_license_logic(&store, license2.clone()).unwrap();

    let loaded1 = load_license_logic(&store, "identity_1".to_string()).unwrap().unwrap();
    let loaded2 = load_license_logic(&store, "identity_2".to_string()).unwrap().unwrap();

    assert_eq!(loaded1.identity_id, "identity_1");
    assert_eq!(loaded2.identity_id, "identity_2");
    assert!(loaded1.is_premium);
    assert!(!loaded2.is_premium);
}

#[test]
fn test_update_existing_license() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let original = ILicense {
        success: true,
        identity_id: "update_test".to_string(),
        txid: "original_tx".to_string(),
        is_premium: false,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    save_license_logic(&store, original).unwrap();

    let updated = ILicense {
        success: true,
        identity_id: "update_test".to_string(),
        txid: "updated_tx".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2100000000".to_string(),
        updated_at: Some("1700005000".to_string()),
    };

    save_license_logic(&store, updated).unwrap();

    let loaded = load_license_logic(&store, "update_test".to_string()).unwrap().unwrap();
    assert_eq!(loaded.txid, "updated_tx");
    assert!(loaded.is_premium);
    assert_eq!(loaded.expires_at, "2100000000");
}

#[test]
fn test_delete_license_from_multiple() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let license1 = ILicense {
        success: true,
        identity_id: "keep_me".to_string(),
        txid: "tx1".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    let license2 = ILicense {
        success: true,
        identity_id: "delete_me".to_string(),
        txid: "tx2".to_string(),
        is_premium: false,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    save_license_logic(&store, license1).unwrap();
    save_license_logic(&store, license2).unwrap();

    delete_license_logic(&store, "delete_me".to_string()).unwrap();

    assert!(load_license_logic(&store, "delete_me".to_string()).unwrap().is_none());
    assert!(load_license_logic(&store, "keep_me".to_string()).unwrap().is_some());
}

#[test]
fn test_delete_license_non_existent() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    // Deleting non-existent should not error
    let result = delete_license_logic(&store, "non_existent".to_string());
    assert!(result.is_ok());
}

#[test]
fn test_license_premium_flag_variants() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let premium = ILicense {
        success: true,
        identity_id: "premium_user".to_string(),
        txid: "tx_premium".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    let free = ILicense {
        success: true,
        identity_id: "free_user".to_string(),
        txid: "tx_free".to_string(),
        is_premium: false,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    save_license_logic(&store, premium).unwrap();
    save_license_logic(&store, free).unwrap();

    let loaded_premium = load_license_logic(&store, "premium_user".to_string()).unwrap().unwrap();
    let loaded_free = load_license_logic(&store, "free_user".to_string()).unwrap().unwrap();

    assert!(loaded_premium.is_premium);
    assert!(!loaded_free.is_premium);
}

#[test]
fn test_license_success_flag_false() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let failed_license = ILicense {
        success: false,
        identity_id: "failed_check".to_string(),
        txid: "".to_string(),
        is_premium: false,
        created_at: "".to_string(),
        expires_at: "".to_string(),
        updated_at: None,
    };

    save_license_logic(&store, failed_license).unwrap();

    let loaded = load_license_logic(&store, "failed_check".to_string()).unwrap().unwrap();
    assert!(!loaded.success);
    assert!(!loaded.is_premium);
}

#[test]
fn test_license_with_updated_at() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let license = ILicense {
        success: true,
        identity_id: "updated_user".to_string(),
        txid: "tx_updated".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: Some("1700005000".to_string()),
    };

    save_license_logic(&store, license).unwrap();

    let loaded = load_license_logic(&store, "updated_user".to_string()).unwrap().unwrap();
    assert_eq!(loaded.updated_at, Some("1700005000".to_string()));
}

#[test]
fn test_license_empty_strings() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let license = ILicense {
        success: true,
        identity_id: "empty_fields".to_string(),
        txid: "".to_string(),
        is_premium: false,
        created_at: "".to_string(),
        expires_at: "".to_string(),
        updated_at: Some("".to_string()),
    };

    save_license_logic(&store, license).unwrap();

    let loaded = load_license_logic(&store, "empty_fields".to_string()).unwrap().unwrap();
    assert_eq!(loaded.txid, "");
    assert_eq!(loaded.created_at, "");
}

#[test]
fn test_license_long_identity_id() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let long_id = "a".repeat(100);
    let license = ILicense {
        success: true,
        identity_id: long_id.clone(),
        txid: "tx_long".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    save_license_logic(&store, license).unwrap();

    let loaded = load_license_logic(&store, long_id).unwrap().unwrap();
    assert_eq!(loaded.identity_id.len(), 100);
}

#[test]
fn test_license_special_chars_in_txid() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    let license = ILicense {
        success: true,
        identity_id: "special_chars".to_string(),
        txid: "tx-123_abc!@#$%".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    save_license_logic(&store, license).unwrap();

    let loaded = load_license_logic(&store, "special_chars".to_string()).unwrap().unwrap();
    assert_eq!(loaded.txid, "tx-123_abc!@#$%");
}

#[test]
fn test_load_license_malformed_json_returns_none() {
    let store = MockStore { storage: Mutex::new(HashMap::new()) };

    // Store malformed JSON
    store.save_value("", "licenses", serde_json::json!("not an object")).unwrap();

    // Should return None instead of error due to unwrap_or(None)
    let result = load_license_logic(&store, "any_id".to_string()).unwrap();
    assert!(result.is_none());
}
