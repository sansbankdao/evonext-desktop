// src-tauri/src/commands/identity_commands/tests.rs

use super::*;
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

#[tokio::test]
async fn test_save_identity_with_keys_atomic_pure() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();
    let identity_id = "atomic_id".to_string();

    let payload = ISaveIdentityPayload {
        identity_id: identity_id.clone(),
        username: "atomic_user".into(),
        balance: "777".into(),
        revision: 2,
        ..Default::default()
    };

    let keys = vec![IPrivateKeyEntry {
        identity_id: identity_id.clone(),
        key_id: 0,
        private_key: "wif_secret".into(),
        ..Default::default()
    }];

    // Test saving
    let res = save_identity_with_keys_logic(&store, network.clone(), payload, keys)
        .await
        .unwrap();

    assert!(res.success);

    // Verify Mapping
    let identity_map = storage::load_identity_map_internal(&store, &network).unwrap();
    assert!(identity_map.contains_key(&identity_id));

    // Verify Keystore
    let keystore = storage::load_keystore_internal(&store, &network).unwrap();
    assert!(keystore.identities.contains_key(&identity_id));
}

#[test]
fn test_identity_mapper_discovery_regression_pure() {
    let payload = ISaveIdentityPayload {
        identity_id: "test_id".into(),
        username: "user".into(),
        balance: "100".into(),
        public_keys: vec![IAnyValue(
            json!({ "id": 0, "data": "A1B2", "type": "ECDSA_SECP256K1" }),
        )],
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert_eq!(result.identity_id, "test_id");
    assert_eq!(result.public_keys.len(), 1);
}

// =====================================================
// REGRESSION LOCK-IN: save_identity_logic always sets active marker
// =====================================================

#[tokio::test]
async fn test_save_identity_always_sets_active_marker() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    let payload = ISaveIdentityPayload {
        identity_id: "new_identity".into(),
        username: "user".into(),
        balance: "100".into(),
        revision: 1,
        // NOTE: active_identity_id is NOT set (None)
        // save_identity_logic must still mark this as active
        ..Default::default()
    };

    let result = save_identity_logic(&store, network.clone(), payload)
        .await
        .unwrap();
    assert!(result.success);

    // Verify __active_identity_id was written
    let raw = store.storage.lock().unwrap();
    let identities_val = raw.get("identities").unwrap();
    let marker = identities_val
        .as_object()
        .unwrap()
        .get("__active_identity_id");
    assert!(
        marker.is_some(),
        "save_identity_logic must always set __active_identity_id"
    );
    assert_eq!(marker.unwrap().as_str().unwrap(), "new_identity");
}

#[tokio::test]
async fn test_save_identity_respects_explicit_active_id() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    // Save first identity
    let payload1 = ISaveIdentityPayload {
        identity_id: "id_a".into(),
        username: "alice".into(),
        balance: "100".into(),
        ..Default::default()
    };
    save_identity_logic(&store, network.clone(), payload1)
        .await
        .unwrap();

    // Save second identity with explicit active override pointing to id_a
    let payload2 = ISaveIdentityPayload {
        identity_id: "id_b".into(),
        username: "bob".into(),
        balance: "200".into(),
        active_identity_id: Some("id_a".to_string()),
        ..Default::default()
    };
    save_identity_logic(&store, network.clone(), payload2)
        .await
        .unwrap();

    // Active should be id_a (the explicit override), not id_b
    let raw = store.storage.lock().unwrap();
    let identities_val = raw.get("identities").unwrap();
    let marker = identities_val
        .as_object()
        .unwrap()
        .get("__active_identity_id");
    assert_eq!(marker.unwrap().as_str().unwrap(), "id_a");
}

#[tokio::test]
async fn test_save_identity_preserves_marker_across_updates() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    // Save identity — sets active marker
    let payload1 = ISaveIdentityPayload {
        identity_id: "persistent_id".into(),
        username: "user_v1".into(),
        balance: "100".into(),
        ..Default::default()
    };
    save_identity_logic(&store, network.clone(), payload1)
        .await
        .unwrap();

    // Simulate update_identity_with_sdk_data calling save_identity_map_internal with None
    // by loading the map, modifying, and saving without active marker
    let mut map = storage::load_identity_map_internal(&store, &network).unwrap();
    if let Some(entry) = map.get_mut("persistent_id") {
        entry.username = "user_v2".to_string();
        entry.balance = "999".to_string();
    }
    storage::save_identity_map_internal(&store, &network, &map, None).unwrap();

    // Active marker must still be "persistent_id"
    let marker = storage::load_active_marker_internal(&store, &network).unwrap();
    assert_eq!(marker, Some("persistent_id".to_string()));

    // Data must be updated
    let loaded = storage::load_identity_map_internal(&store, &network).unwrap();
    assert_eq!(loaded.get("persistent_id").unwrap().username, "user_v2");
    assert_eq!(loaded.get("persistent_id").unwrap().balance, "999");
}

// =====================================================
// REGRESSION LOCK-IN: load_active_identity_logic
// =====================================================

#[test]
fn test_load_active_identity_logic_returns_identity_data() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    // Manually seed the store with identity data + marker
    let raw_data = json!({
        "__active_identity_id": "found_id",
        "found_id": {
            "identityId": "found_id",
            "username": "tester",
            "balance": "5000",
            "revision": 3,
            "publicKeys": [],
            "isAuthenticated": true
        }
    });
    {
        let mut map = store.storage.lock().unwrap();
        map.insert("identities".to_string(), raw_data);
    }

    let result = load_active_identity_logic(&store, network).unwrap();
    assert_eq!(result.active_identity_id, Some("found_id".to_string()));
    assert!(result.identity.is_some());
    assert_eq!(result.identity.unwrap().username, "tester");
    assert_eq!(result.identity_count, 1);
}

#[test]
fn test_load_active_identity_logic_returns_none_for_empty_store() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    let result = load_active_identity_logic(&store, network).unwrap();
    assert_eq!(result.active_identity_id, None);
    assert!(result.identity.is_none());
    assert_eq!(result.identity_count, 0);
}

#[test]
fn test_load_active_identity_logic_marker_without_matching_identity() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    // Marker points to non-existent identity
    let raw_data = json!({
        "__active_identity_id": "ghost_id",
        "other_id": {
            "identityId": "other_id",
            "username": "other",
            "balance": "0",
            "publicKeys": [],
            "isAuthenticated": true
        }
    });
    {
        let mut map = store.storage.lock().unwrap();
        map.insert("identities".to_string(), raw_data);
    }

    let result = load_active_identity_logic(&store, network).unwrap();
    assert_eq!(result.active_identity_id, Some("ghost_id".to_string()));
    assert!(result.identity.is_none()); // marker exists but identity doesn't
    assert_eq!(result.identity_count, 1); // other_id is still counted
}

// =====================================================
// REGRESSION LOCK-IN: load_identities_map_logic
// =====================================================

#[test]
fn test_load_identities_map_logic_returns_all_identities() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    let raw_data = json!({
        "__active_identity_id": "id_a",
        "id_a": {
            "identityId": "id_a",
            "username": "alice",
            "balance": "100",
            "publicKeys": [],
            "isAuthenticated": true
        },
        "id_b": {
            "identityId": "id_b",
            "username": "bob",
            "balance": "200",
            "publicKeys": [],
            "isAuthenticated": true
        }
    });
    {
        let mut map = store.storage.lock().unwrap();
        map.insert("identities".to_string(), raw_data);
    }

    let result = load_identities_map_logic(&store, network).unwrap();
    let obj = result.0.as_object().unwrap();
    // Should contain identities but NOT the __ marker
    assert!(obj.contains_key("id_a"));
    assert!(obj.contains_key("id_b"));
    assert!(!obj.contains_key("__active_identity_id"));
}

#[test]
fn test_load_identities_map_logic_empty_store() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    let result = load_identities_map_logic(&store, network).unwrap();
    let obj = result.0.as_object().unwrap();
    assert!(obj.is_empty());
}

// =====================================================
// NEW TESTS: IdentityMapper edge cases
// =====================================================

#[test]
fn test_identity_mapper_sets_is_authenticated_true() {
    let payload = ISaveIdentityPayload {
        identity_id: "auth_id".into(),
        username: "authuser".into(),
        balance: "0".into(),
        revision: 1,
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert!(result.is_authenticated);
}

#[test]
fn test_identity_mapper_uses_provided_created_at() {
    let payload = ISaveIdentityPayload {
        identity_id: "ts_id".into(),
        username: "tsuser".into(),
        balance: "0".into(),
        revision: 1,
        created_at: Some("2024-01-01T00:00:00Z".to_string()),
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert_eq!(result.created_at, Some("2024-01-01T00:00:00Z".to_string()));
}

#[test]
fn test_identity_mapper_defaults_created_at_if_missing() {
    let payload = ISaveIdentityPayload {
        identity_id: "no_ts_id".into(),
        username: "user".into(),
        balance: "0".into(),
        revision: 1,
        created_at: None,
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert!(result.created_at.is_some()); // Should be auto-populated
}

#[test]
fn test_identity_mapper_preserves_optional_fields() {
    let payload = ISaveIdentityPayload {
        identity_id: "opt_id".into(),
        username: "optuser".into(),
        balance: "500".into(),
        revision: 3,
        identity_idx: Some(7),
        dpns_username: Some("optuser.dash".into()),
        public_key_ids: Some(vec![0, 1, 2]),
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert_eq!(result.identity_idx, Some(7));
    assert_eq!(result.dpns_username, Some("optuser.dash".to_string()));
    assert_eq!(result.public_key_ids, Some(vec![0, 1, 2]));
}

#[test]
fn test_identity_mapper_filters_invalid_public_keys() {
    // A non-object value should be filtered out by normalize_public_key
    let payload = ISaveIdentityPayload {
        identity_id: "filter_id".into(),
        username: "user".into(),
        balance: "0".into(),
        revision: 1,
        public_keys: vec![
            IAnyValue(json!("not_an_object")),
            IAnyValue(json!({ "data": "abcd", "type": "ECDSA_SECP256K1" })),
            IAnyValue(json!(null)),
        ],
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    // Only the valid key should survive
    assert_eq!(result.public_keys.len(), 1);
    assert_eq!(result.public_keys[0].data, "abcd");
}

// =====================================================
// NEW TESTS: save_identity_logic payload field
// =====================================================

#[tokio::test]
async fn test_save_identity_returns_identity_id_in_payload() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let payload = ISaveIdentityPayload {
        identity_id: "payload_test_id".into(),
        username: "user".into(),
        balance: "0".into(),
        ..Default::default()
    };
    let result = save_identity_logic(&store, "testnet".into(), payload)
        .await
        .unwrap();
    assert!(result.success);
    assert!(result.error.is_none());
    let payload_val = result.payload.unwrap();
    assert_eq!(
        payload_val.0.get("identityId").unwrap().as_str().unwrap(),
        "payload_test_id"
    );
}

// =====================================================
// NEW TESTS: save_keys_logic
// =====================================================

#[tokio::test]
async fn test_save_keys_logic_creates_keystore_entry() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();
    let identity_id = "keys_id".to_string();

    let keys = vec![IPrivateKeyEntry {
        identity_id: identity_id.clone(),
        key_id: 0,
        private_key: "secret_wif".into(),
        ..Default::default()
    }];

    let result = save_keys_logic(&store, network.clone(), identity_id.clone(), keys)
        .await
        .unwrap();
    assert!(result);

    let keystore = storage::load_keystore_internal(&store, &network).unwrap();
    let entries = keystore.identities.get(&identity_id).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].private_key, "secret_wif");
}

#[tokio::test]
async fn test_save_keys_logic_updates_existing_key() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();
    let identity_id = "update_keys_id".to_string();

    // Save initial key
    let keys1 = vec![IPrivateKeyEntry {
        identity_id: identity_id.clone(),
        key_id: 0,
        private_key: "original_wif".into(),
        ..Default::default()
    }];
    save_keys_logic(&store, network.clone(), identity_id.clone(), keys1)
        .await
        .unwrap();

    // Update the same key_id
    let keys2 = vec![IPrivateKeyEntry {
        identity_id: identity_id.clone(),
        key_id: 0,
        private_key: "updated_wif".into(),
        ..Default::default()
    }];
    save_keys_logic(&store, network.clone(), identity_id.clone(), keys2)
        .await
        .unwrap();

    let keystore = storage::load_keystore_internal(&store, &network).unwrap();
    let entries = keystore.identities.get(&identity_id).unwrap();
    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].private_key, "updated_wif");
}

#[tokio::test]
async fn test_save_keys_logic_appends_different_key_ids() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();
    let identity_id = "multi_keys_id".to_string();

    let keys1 = vec![IPrivateKeyEntry {
        identity_id: identity_id.clone(),
        key_id: 0,
        private_key: "wif_0".into(),
        ..Default::default()
    }];
    save_keys_logic(&store, network.clone(), identity_id.clone(), keys1)
        .await
        .unwrap();

    let keys2 = vec![IPrivateKeyEntry {
        identity_id: identity_id.clone(),
        key_id: 1,
        private_key: "wif_1".into(),
        ..Default::default()
    }];
    save_keys_logic(&store, network.clone(), identity_id.clone(), keys2)
        .await
        .unwrap();

    let keystore = storage::load_keystore_internal(&store, &network).unwrap();
    let entries = keystore.identities.get(&identity_id).unwrap();
    assert_eq!(entries.len(), 2);
}

// =====================================================
// NEW TESTS: load_active_identity_logic edge cases
// =====================================================

#[test]
fn test_load_active_identity_logic_multiple_identities_count() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();

    let raw_data = json!({
        "__active_identity_id": "id_a",
        "id_a": {
            "identityId": "id_a",
            "username": "alice",
            "balance": "100",
            "publicKeys": [],
            "isAuthenticated": true
        },
        "id_b": {
            "identityId": "id_b",
            "username": "bob",
            "balance": "200",
            "publicKeys": [],
            "isAuthenticated": true
        },
        "id_c": {
            "identityId": "id_c",
            "username": "charlie",
            "balance": "300",
            "publicKeys": [],
            "isAuthenticated": false
        }
    });
    {
        let mut map = store.storage.lock().unwrap();
        map.insert("identities".to_string(), raw_data);
    }

    let result = load_active_identity_logic(&store, network).unwrap();
    assert_eq!(result.identity_count, 3);
    assert!(result.identity.is_some());
    assert_eq!(result.identity.unwrap().username, "alice");
}

#[test]
fn test_load_active_identity_logic_invalid_network() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = load_active_identity_logic(&store, "invalid_net".into());
    assert!(result.is_err());
}

#[test]
fn test_load_identities_map_logic_invalid_network() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let result = load_identities_map_logic(&store, "invalid_net".into());
    assert!(result.is_err());
}

// =====================================================
// NEW TESTS: save_identity_with_keys_logic error paths
// =====================================================

#[tokio::test]
async fn test_save_identity_with_keys_logic_multiple_keys() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let network = "testnet".to_string();
    let identity_id = "multi_key_id".to_string();

    let payload = ISaveIdentityPayload {
        identity_id: identity_id.clone(),
        username: "multiuser".into(),
        balance: "1000".into(),
        revision: 1,
        ..Default::default()
    };

    let keys = vec![
        IPrivateKeyEntry {
            identity_id: identity_id.clone(),
            key_id: 0,
            private_key: "wif_0".into(),
            ..Default::default()
        },
        IPrivateKeyEntry {
            identity_id: identity_id.clone(),
            key_id: 1,
            private_key: "wif_1".into(),
            ..Default::default()
        },
    ];

    let res = save_identity_with_keys_logic(&store, network.clone(), payload, keys)
        .await
        .unwrap();
    assert!(res.success);
    assert!(res.error.is_none());
    assert!(res.payload.is_none());

    let keystore = storage::load_keystore_internal(&store, &network).unwrap();
    let entries = keystore.identities.get(&identity_id).unwrap();
    assert_eq!(entries.len(), 2);
}
