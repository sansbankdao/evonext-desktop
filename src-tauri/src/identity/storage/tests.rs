// src-tauri/src/identity/storage/tests.rs

use super::*;
use crate::models::{IIdentityData, IPrivateKeyStore};
use crate::utils::{PersistentStore, StoreError};
use serde_json::{json, Value};
use std::cell::RefCell;
use std::collections::HashMap;
/// A manual mock of PersistentStore with named fields and correct trait signatures.
struct MockStore {
    data: RefCell<HashMap<(String, String), Value>>,
    should_fail: bool,
}
impl MockStore {
    fn new() -> Self {
        Self {
            data: RefCell::new(HashMap::new()),
            should_fail: false,
        }
    }
    fn with_error() -> Self {
        Self {
            data: RefCell::new(HashMap::new()),
            should_fail: true,
        }
    }
}
impl PersistentStore for MockStore {
    fn load_value(&self, file_path: &str, key: &str) -> Result<Option<Value>, StoreError> {
        if self.should_fail {
            return Err(StoreError::Store("Mock Error".to_string()));
        }
        let storage = self.data.borrow();
        Ok(storage
            .get(&(file_path.to_string(), key.to_string()))
            .cloned())
    }
    fn save_value(&self, file_path: &str, key: &str, value: Value) -> Result<(), StoreError> {
        if self.should_fail {
            return Err(StoreError::Store("Mock Error".to_string()));
        }
        let mut storage = self.data.borrow_mut();
        storage.insert((file_path.to_string(), key.to_string()), value);
        Ok(())
    }
    fn delete_value(&self, _file_path: &str, _key: &str) -> Result<(), StoreError> {
        if self.should_fail {
            return Err(StoreError::Store("Mock Error".to_string()));
        }
        Ok(())
    }
}
#[test]
fn test_process_raw_identity_map_filters_metadata() {
    let input = json!({
        "id_1": {
            "identityId": "id_1",
            "username": "tester",
            "balance": "0",
            "publicKeys": [],
            "isAuthenticated": false
        },
        "__active_identity_id": "id_1"
    });
    let map = process_raw_identity_map(input);
    // Keys starting with __ are skipped by the loop in storage.rs
    assert!(map.contains_key("id_1"));
    assert!(!map.contains_key("__active_identity_id"));
}
#[test]
fn test_handling_malformed_identities() {
    let input = json!({
        "valid_id": {
            "identityId": "valid_id",
            "username": "tester",
            "balance": "0",
            "publicKeys": [],
            "isAuthenticated": true
        },
        "corrupted_id": "not-an-object"
    });
    let map = process_raw_identity_map(input);
    assert_eq!(map.len(), 1);
    assert!(map.contains_key("valid_id"));
}
#[test]
fn test_identity_storage_roundtrip_logic() {
    let store = MockStore::new();
    let network = "testnet";
    let mut map = HashMap::new();
    let data = IIdentityData {
        identity_id: "test_id".to_string(),
        username: "test_user".to_string(),
        balance: "100.5".to_string(),
        ..Default::default()
    };
    map.insert("test_id".to_string(), data);
    save_identity_map_internal(&store, network, &map, Some("test_id".to_string()))
        .expect("Save failed");
    let loaded_map = load_identity_map_internal(&store, network).expect("Load failed");
    assert_eq!(loaded_map.len(), 1);
    assert!(loaded_map.contains_key("test_id"));
    assert_eq!(loaded_map.get("test_id").unwrap().username, "test_user");
}
#[test]
fn test_keystore_storage_logic() {
    let store = MockStore::new();
    let network = "mainnet";
    let keystore = IPrivateKeyStore::default();
    save_keystore_internal(&store, network, &keystore).expect("Save failed");
    let loaded = load_keystore_internal(&store, network).expect("Load failed");
    assert_eq!(loaded, keystore);
}
#[test]
fn test_load_empty_store_returns_defaults() {
    let store = MockStore::new();
    let network = "mainnet";
    let identities = load_identity_map_internal(&store, network).unwrap();
    let keystore = load_keystore_internal(&store, network).unwrap();
    assert!(identities.is_empty());
    assert_eq!(keystore, IPrivateKeyStore::default());
}
#[test]
fn test_storage_errors_propagate() {
    let store = MockStore::with_error();
    let network = "mainnet";
    assert!(load_identity_map_internal(&store, network).is_err());
    assert!(load_keystore_internal(&store, network).is_err());
}
#[test]
fn test_process_raw_identity_map_skips_internal_keys() {
    let input = json!({
        "__active": "true",
        "__version": 1,
        "actual_id": {
            "identityId": "actual_id",
            "username": "user",
            "balance": "0",
            "publicKeys": [],
            "isAuthenticated": false
        }
    });
    let map = process_raw_identity_map(input);
    assert_eq!(map.len(), 1);
    assert!(map.contains_key("actual_id"));
}

// =====================================================
// REGRESSION LOCK-IN: Active Identity Marker Tests
// These tests guarantee __active_identity_id is never
// silently dropped by save operations.
// =====================================================

#[test]
fn test_active_marker_written_on_save() {
    let store = MockStore::new();
    let network = "testnet";
    let mut map = HashMap::new();
    let data = IIdentityData {
        identity_id: "active_id".to_string(),
        username: "alice".to_string(),
        balance: "500".to_string(),
        ..Default::default()
    };
    map.insert("active_id".to_string(), data);

    // Save with explicit active marker
    save_identity_map_internal(&store, network, &map, Some("active_id".to_string()))
        .expect("Save failed");

    // Read raw value from store to verify __active_identity_id is present
    let filename = crate::utils::network_file::get_network_file(network, "identity").unwrap();
    let raw = store.load_value(&filename, "identities").unwrap().unwrap();
    let marker = raw.as_object().unwrap().get("__active_identity_id");
    assert!(
        marker.is_some(),
        "__active_identity_id must be present in saved data"
    );
    assert_eq!(marker.unwrap().as_str().unwrap(), "active_id");
}

#[test]
fn test_active_marker_preserved_when_none_passed() {
    let store = MockStore::new();
    let network = "testnet";

    // First save: set the active marker
    let mut map = HashMap::new();
    let data = IIdentityData {
        identity_id: "first_id".to_string(),
        username: "alice".to_string(),
        balance: "100".to_string(),
        ..Default::default()
    };
    map.insert("first_id".to_string(), data);
    save_identity_map_internal(&store, network, &map, Some("first_id".to_string()))
        .expect("First save failed");

    // Second save: pass None for active_marker (simulates update_identity_with_sdk_data)
    // The existing __active_identity_id MUST be preserved
    let mut map2 = HashMap::new();
    let data2 = IIdentityData {
        identity_id: "first_id".to_string(),
        username: "alice_updated".to_string(),
        balance: "200".to_string(),
        ..Default::default()
    };
    map2.insert("first_id".to_string(), data2);
    save_identity_map_internal(&store, network, &map2, None).expect("Second save failed");

    // Verify: __active_identity_id must still be "first_id"
    let filename = crate::utils::network_file::get_network_file(network, "identity").unwrap();
    let raw = store.load_value(&filename, "identities").unwrap().unwrap();
    let marker = raw.as_object().unwrap().get("__active_identity_id");
    assert!(
        marker.is_some(),
        "__active_identity_id must be preserved on save with None"
    );
    assert_eq!(marker.unwrap().as_str().unwrap(), "first_id");

    // Also verify the data was actually updated
    let loaded = load_identity_map_internal(&store, network).unwrap();
    assert_eq!(loaded.get("first_id").unwrap().username, "alice_updated");
    assert_eq!(loaded.get("first_id").unwrap().balance, "200");
}

#[test]
fn test_active_marker_overwritten_with_explicit_value() {
    let store = MockStore::new();
    let network = "testnet";

    // First save: set active to "id_a"
    let mut map = HashMap::new();
    map.insert(
        "id_a".to_string(),
        IIdentityData {
            identity_id: "id_a".to_string(),
            username: "alice".to_string(),
            ..Default::default()
        },
    );
    save_identity_map_internal(&store, network, &map, Some("id_a".to_string()))
        .expect("First save failed");

    // Second save: explicitly switch active to "id_b"
    map.insert(
        "id_b".to_string(),
        IIdentityData {
            identity_id: "id_b".to_string(),
            username: "bob".to_string(),
            ..Default::default()
        },
    );
    save_identity_map_internal(&store, network, &map, Some("id_b".to_string()))
        .expect("Second save failed");

    // Verify: __active_identity_id must now be "id_b"
    let filename = crate::utils::network_file::get_network_file(network, "identity").unwrap();
    let raw = store.load_value(&filename, "identities").unwrap().unwrap();
    let marker = raw.as_object().unwrap().get("__active_identity_id");
    assert_eq!(marker.unwrap().as_str().unwrap(), "id_b");
}

#[test]
fn test_extract_active_marker_from_raw_value() {
    let val = json!({
        "__active_identity_id": "my_active_id",
        "some_id": { "identityId": "some_id" }
    });
    let marker = extract_active_marker(&val);
    assert_eq!(marker, Some("my_active_id".to_string()));
}

#[test]
fn test_extract_active_marker_returns_none_when_missing() {
    let val = json!({
        "some_id": { "identityId": "some_id" }
    });
    let marker = extract_active_marker(&val);
    assert_eq!(marker, None);
}

#[test]
fn test_extract_active_marker_returns_none_for_non_object() {
    let val = json!("just a string");
    let marker = extract_active_marker(&val);
    assert_eq!(marker, None);
}

#[test]
fn test_load_active_marker_internal_reads_from_file() {
    let store = MockStore::new();
    let network = "testnet";

    // Save with active marker
    let mut map = HashMap::new();
    map.insert(
        "test_id".to_string(),
        IIdentityData {
            identity_id: "test_id".to_string(),
            username: "user".to_string(),
            ..Default::default()
        },
    );
    save_identity_map_internal(&store, network, &map, Some("test_id".to_string()))
        .expect("Save failed");

    // Load the marker back
    let marker = load_active_marker_internal(&store, network).unwrap();
    assert_eq!(marker, Some("test_id".to_string()));
}

#[test]
fn test_load_active_marker_internal_returns_none_for_empty_store() {
    let store = MockStore::new();
    let network = "testnet";
    let marker = load_active_marker_internal(&store, network).unwrap();
    assert_eq!(marker, None);
}

#[test]
fn test_clear_active_marker_internal_removes_marker() {
    let store = MockStore::new();
    let network = "testnet";

    // Save with active marker
    let mut map = HashMap::new();
    map.insert(
        "test_id".to_string(),
        IIdentityData {
            identity_id: "test_id".to_string(),
            username: "user".to_string(),
            ..Default::default()
        },
    );
    save_identity_map_internal(&store, network, &map, Some("test_id".to_string()))
        .expect("Save failed");

    // Verify marker exists
    let marker = load_active_marker_internal(&store, network).unwrap();
    assert_eq!(marker, Some("test_id".to_string()));

    // Clear it
    clear_active_marker_internal(&store, network).expect("Clear failed");

    // Verify marker is gone
    let marker_after = load_active_marker_internal(&store, network).unwrap();
    assert_eq!(marker_after, None);

    // Verify identity data is still intact
    let loaded = load_identity_map_internal(&store, network).unwrap();
    assert_eq!(loaded.len(), 1);
    assert!(loaded.contains_key("test_id"));
}

#[test]
fn test_multiple_saves_with_none_never_drop_marker() {
    // This is the exact regression scenario: multiple sequential saves
    // with None (as happens during connect flow) must never drop the marker.
    let store = MockStore::new();
    let network = "testnet";

    let mut map = HashMap::new();
    map.insert(
        "persistent_id".to_string(),
        IIdentityData {
            identity_id: "persistent_id".to_string(),
            username: "user".to_string(),
            ..Default::default()
        },
    );

    // Save 1: set marker
    save_identity_map_internal(&store, network, &map, Some("persistent_id".to_string()))
        .expect("Save 1 failed");

    // Save 2: None (simulates save_keys_logic reading/writing)
    save_identity_map_internal(&store, network, &map, None).expect("Save 2 failed");

    // Save 3: None again (simulates update_identity_with_sdk_data)
    save_identity_map_internal(&store, network, &map, None).expect("Save 3 failed");

    // Save 4: None yet again (simulates any other update)
    save_identity_map_internal(&store, network, &map, None).expect("Save 4 failed");

    // After 4 saves, 3 with None, the marker MUST still be present
    let filename = crate::utils::network_file::get_network_file(network, "identity").unwrap();
    let raw = store.load_value(&filename, "identities").unwrap().unwrap();
    let marker = raw.as_object().unwrap().get("__active_identity_id");
    assert!(
        marker.is_some(),
        "Active marker must survive multiple saves with None"
    );
    assert_eq!(marker.unwrap().as_str().unwrap(), "persistent_id");
}

// =====================================================
// NEW TESTS: error propagation and edge cases
// =====================================================

#[test]
fn test_save_identity_map_internal_error_propagation() {
    let store = MockStore::with_error();
    let network = "testnet";
    let map = HashMap::new();
    let result = save_identity_map_internal(&store, network, &map, None);
    assert!(result.is_err());
}

#[test]
fn test_save_keystore_internal_error_propagation() {
    let store = MockStore::with_error();
    let network = "testnet";
    let keystore = IPrivateKeyStore::default();
    let result = save_keystore_internal(&store, network, &keystore);
    assert!(result.is_err());
}

#[test]
fn test_load_active_marker_internal_error_propagation() {
    let store = MockStore::with_error();
    let result = load_active_marker_internal(&store, "testnet");
    assert!(result.is_err());
}

#[test]
fn test_clear_active_marker_internal_error_on_load() {
    let store = MockStore::with_error();
    let result = clear_active_marker_internal(&store, "testnet");
    assert!(result.is_err());
}

#[test]
fn test_process_raw_identity_map_empty_object() {
    let input = json!({});
    let map = process_raw_identity_map(input);
    assert!(map.is_empty());
}

#[test]
fn test_process_raw_identity_map_non_object_input() {
    let input = json!([1, 2, 3]);
    let map = process_raw_identity_map(input);
    assert!(map.is_empty());
}

#[test]
fn test_process_raw_identity_map_null_input() {
    let input = json!(null);
    let map = process_raw_identity_map(input);
    assert!(map.is_empty());
}

#[test]
fn test_extract_active_marker_non_string_value() {
    let val = json!({
        "__active_identity_id": 12345
    });
    let marker = extract_active_marker(&val);
    assert_eq!(marker, None); // Not a string, so None
}

#[test]
fn test_load_keystore_internal_malformed_data() {
    let store = MockStore::new();
    let network = "testnet";
    let filename = crate::utils::network_file::get_network_file(network, "safu").unwrap();
    // Save invalid data for keystore
    store
        .save_value(&filename, "keystore", json!("not a keystore"))
        .unwrap();
    let result = load_keystore_internal(&store, network);
    assert!(result.is_err());
}

#[test]
fn test_invalid_network_errors() {
    let store = MockStore::new();
    assert!(load_identity_map_internal(&store, "badnet").is_err());
    assert!(load_keystore_internal(&store, "badnet").is_err());
    assert!(load_active_marker_internal(&store, "badnet").is_err());
    assert!(clear_active_marker_internal(&store, "badnet").is_err());

    let map = HashMap::new();
    assert!(save_identity_map_internal(&store, "badnet", &map, None).is_err());

    let ks = IPrivateKeyStore::default();
    assert!(save_keystore_internal(&store, "badnet", &ks).is_err());
}

#[test]
fn test_save_identity_map_with_empty_map_and_marker() {
    let store = MockStore::new();
    let network = "testnet";
    let map = HashMap::new();
    // Save empty map with a marker
    save_identity_map_internal(&store, network, &map, Some("orphan_marker".to_string()))
        .expect("Save failed");

    let marker = load_active_marker_internal(&store, network).unwrap();
    assert_eq!(marker, Some("orphan_marker".to_string()));

    let loaded = load_identity_map_internal(&store, network).unwrap();
    assert!(loaded.is_empty());
}

#[test]
fn test_keystore_roundtrip_with_data() {
    let store = MockStore::new();
    let network = "testnet";

    let mut keystore = IPrivateKeyStore::default();
    keystore.mnemonic = Some(crate::models::IMnemonic {
        seed_phrase: "test phrase words".to_string(),
    });
    keystore.identities.insert(
        "id1".to_string(),
        vec![crate::models::IPrivateKeyEntry {
            identity_id: "id1".to_string(),
            key_id: 0,
            private_key: "wif_key".to_string(),
            ..Default::default()
        }],
    );

    save_keystore_internal(&store, network, &keystore).unwrap();
    let loaded = load_keystore_internal(&store, network).unwrap();
    assert_eq!(loaded.mnemonic.unwrap().seed_phrase, "test phrase words");
    assert!(loaded.identities.contains_key("id1"));
    assert_eq!(loaded.identities["id1"].len(), 1);
}
