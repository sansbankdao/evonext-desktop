// src-tauri/src/commands/identity_details_commands/tests.rs

use super::*;
use crate::models::IIdentityData;
use crate::utils::{PersistentStore, StoreError};
use serde_json::Value;
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

fn create_test_identity(identity_id: &str) -> IIdentityData {
    IIdentityData {
        identity_id: identity_id.to_string(),
        username: "testuser".to_string(),
        balance: "1000".to_string(),
        revision: 1,
        public_keys: vec![],
        identity_idx: Some(0),
        dpns_username: Some("testuser".to_string()),
        is_authenticated: false,
        created_at: Some("2024-01-01T00:00:00Z".to_string()),
        public_key_ids: Some(vec![0, 1]),
    }
}

#[test]
fn test_identity_details_missing_identity_pure() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let res = update_identity_with_sdk_data_logic(
        &store,
        "testnet".into(),
        "non_existent".into(),
        vec![],
        1,
        vec![],
    );
    assert!(res.is_err());
    assert!(res.unwrap_err().contains("not found"));
}

#[test]
fn test_update_identity_with_sdk_data_success() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    // Set up initial identity in storage
    let mut identities = HashMap::new();
    identities.insert(
        "test_identity".to_string(),
        create_test_identity("test_identity"),
    );
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    let new_public_keys = vec![
        IIdentityPublicKey {
            id: 0,
            type_: "ECDSA_SECP256K1".to_string(),
            purpose: 0,
            security_level: 0,
            data: "0xabcdef".to_string(),
            read_only: false,
            disabled_at: None,
        },
        IIdentityPublicKey {
            id: 1,
            type_: "BLS12_381".to_string(),
            purpose: 3,
            security_level: 2,
            data: "0x123456".to_string(),
            read_only: true,
            disabled_at: Some("2024-06-01T00:00:00Z".to_string()),
        },
    ];

    let result = update_identity_with_sdk_data_logic(
        &store,
        "testnet".to_string(),
        "test_identity".to_string(),
        new_public_keys.clone(),
        5,
        vec![0, 1],
    );

    assert!(result.is_ok());

    // Verify the update
    let loaded = store.load_value("", "identities").unwrap().unwrap();
    let loaded_map: HashMap<String, IIdentityData> = serde_json::from_value(loaded).unwrap();
    let updated = loaded_map.get("test_identity").unwrap();
    assert_eq!(updated.public_keys.len(), 2);
    assert_eq!(updated.revision, 5);
    assert!(updated.is_authenticated);
    assert_eq!(updated.public_keys[0].id, 0);
    assert_eq!(updated.public_keys[1].purpose, 3);
}

#[test]
fn test_update_identity_sets_authenticated_flag() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    // Set up initial identity
    let mut identities = HashMap::new();
    let mut identity = create_test_identity("auth_test_id");
    identity.is_authenticated = false;
    identities.insert("auth_test_id".to_string(), identity);
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    let result = update_identity_with_sdk_data_logic(
        &store,
        "testnet".to_string(),
        "auth_test_id".to_string(),
        vec![],
        2,
        vec![],
    );

    assert!(result.is_ok());

    let loaded = store.load_value("", "identities").unwrap().unwrap();
    let loaded_map: HashMap<String, IIdentityData> = serde_json::from_value(loaded).unwrap();
    assert!(loaded_map.get("auth_test_id").unwrap().is_authenticated);
}

#[test]
fn test_update_identity_empty_public_keys() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let mut identities = HashMap::new();
    identities.insert(
        "empty_keys_id".to_string(),
        create_test_identity("empty_keys_id"),
    );
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    let result = update_identity_with_sdk_data_logic(
        &store,
        "testnet".to_string(),
        "empty_keys_id".to_string(),
        vec![],
        1,
        vec![],
    );

    assert!(result.is_ok());

    let loaded = store.load_value("", "identities").unwrap().unwrap();
    let loaded_map: HashMap<String, IIdentityData> = serde_json::from_value(loaded).unwrap();
    let updated = loaded_map.get("empty_keys_id").unwrap();
    assert!(updated.public_keys.is_empty());
}

#[test]
fn test_update_identity_preserves_other_identities() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let mut identities = HashMap::new();
    identities.insert("identity_1".to_string(), create_test_identity("identity_1"));
    identities.insert("identity_2".to_string(), create_test_identity("identity_2"));
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    let new_key = IIdentityPublicKey {
        id: 0,
        type_: "ECDSA_SECP256K1".to_string(),
        purpose: 0,
        security_level: 0,
        data: "0xkey".to_string(),
        read_only: false,
        disabled_at: None,
    };

    let result = update_identity_with_sdk_data_logic(
        &store,
        "testnet".to_string(),
        "identity_1".to_string(),
        vec![new_key],
        2,
        vec![0],
    );

    assert!(result.is_ok());

    let loaded = store.load_value("", "identities").unwrap().unwrap();
    let loaded_map: HashMap<String, IIdentityData> = serde_json::from_value(loaded).unwrap();
    assert!(loaded_map.contains_key("identity_1"));
    assert!(loaded_map.contains_key("identity_2"));
    assert_eq!(loaded_map.get("identity_1").unwrap().revision, 2);
    assert_eq!(loaded_map.get("identity_2").unwrap().revision, 1);
}

#[test]
fn test_get_identity_public_keys_found() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let mut identity = create_test_identity("keys_test_id");
    identity.public_keys = vec![IIdentityPublicKey {
        id: 0,
        type_: "ECDSA_SECP256K1".to_string(),
        purpose: 0,
        security_level: 0,
        data: "0xabc".to_string(),
        read_only: false,
        disabled_at: None,
    }];

    let mut identities = HashMap::new();
    identities.insert("keys_test_id".to_string(), identity);
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    let result =
        get_identity_public_keys_logic(&store, "testnet".to_string(), "keys_test_id".to_string());

    assert!(result.is_ok());
    let keys = result.unwrap();
    assert!(keys.is_some());
    assert_eq!(keys.unwrap().len(), 1);
}

#[test]
fn test_get_identity_public_keys_not_found() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let result =
        get_identity_public_keys_logic(&store, "testnet".to_string(), "non_existent".to_string());

    assert!(result.is_ok());
    assert!(result.unwrap().is_none());
}

#[test]
fn test_get_identity_public_keys_empty() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let mut identities = HashMap::new();
    identities.insert(
        "empty_keys_identity".to_string(),
        create_test_identity("empty_keys_identity"),
    );
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    let result = get_identity_public_keys_logic(
        &store,
        "testnet".to_string(),
        "empty_keys_identity".to_string(),
    );

    assert!(result.is_ok());
    let keys = result.unwrap();
    assert!(keys.is_some());
    assert!(keys.unwrap().is_empty());
}

#[test]
fn test_delete_identity_public_keys_success() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let mut identity = create_test_identity("delete_keys_id");
    identity.public_keys = vec![IIdentityPublicKey {
        id: 0,
        type_: "ECDSA_SECP256K1".to_string(),
        purpose: 0,
        security_level: 0,
        data: "0xabc".to_string(),
        read_only: false,
        disabled_at: None,
    }];

    let mut identities = HashMap::new();
    identities.insert("delete_keys_id".to_string(), identity);
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    let result = delete_identity_public_keys_logic(
        &store,
        "testnet".to_string(),
        "delete_keys_id".to_string(),
    );

    assert!(result.is_ok());

    let loaded = store.load_value("", "identities").unwrap().unwrap();
    let loaded_map: HashMap<String, IIdentityData> = serde_json::from_value(loaded).unwrap();
    assert!(loaded_map
        .get("delete_keys_id")
        .unwrap()
        .public_keys
        .is_empty());
}

#[test]
fn test_delete_identity_public_keys_not_found() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let result = delete_identity_public_keys_logic(
        &store,
        "testnet".to_string(),
        "non_existent".to_string(),
    );

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not found"));
}

#[test]
fn test_delete_identity_public_keys_preserves_other_data() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let mut identity = create_test_identity("preserve_data_id");
    identity.revision = 5;
    identity.public_keys = vec![IIdentityPublicKey {
        id: 0,
        type_: "ECDSA_SECP256K1".to_string(),
        purpose: 0,
        security_level: 0,
        data: "0xkey".to_string(),
        read_only: false,
        disabled_at: None,
    }];

    let mut identities = HashMap::new();
    identities.insert("preserve_data_id".to_string(), identity);
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    delete_identity_public_keys_logic(
        &store,
        "testnet".to_string(),
        "preserve_data_id".to_string(),
    )
    .unwrap();

    let loaded = store.load_value("", "identities").unwrap().unwrap();
    let loaded_map: HashMap<String, IIdentityData> = serde_json::from_value(loaded).unwrap();
    let loaded_identity = loaded_map.get("preserve_data_id").unwrap();
    assert!(loaded_identity.public_keys.is_empty());
    assert_eq!(loaded_identity.revision, 5);
    assert_eq!(loaded_identity.balance, "1000");
    assert_eq!(loaded_identity.username, "testuser");
}

#[test]
fn test_update_identity_multiple_networks() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    // Set up testnet identity
    let mut testnet_identities = HashMap::new();
    testnet_identities.insert(
        "multi_network_id".to_string(),
        create_test_identity("multi_network_id"),
    );
    store
        .save_value(
            "",
            "identities",
            serde_json::to_value(&testnet_identities).unwrap(),
        )
        .unwrap();

    // Note: In real usage, different networks would use different file keys
    // Here we're testing that the logic correctly handles the identity lookup
    let result = update_identity_with_sdk_data_logic(
        &store,
        "testnet".to_string(),
        "multi_network_id".to_string(),
        vec![],
        2,
        vec![],
    );

    assert!(result.is_ok());

    let loaded = store.load_value("", "identities").unwrap().unwrap();
    let loaded_map: HashMap<String, IIdentityData> = serde_json::from_value(loaded).unwrap();
    assert_eq!(loaded_map.get("multi_network_id").unwrap().revision, 2);
}

#[test]
fn test_update_identity_with_high_revision() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let mut identities = HashMap::new();
    identities.insert(
        "high_rev_id".to_string(),
        create_test_identity("high_rev_id"),
    );
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    let result = update_identity_with_sdk_data_logic(
        &store,
        "testnet".to_string(),
        "high_rev_id".to_string(),
        vec![],
        u32::MAX,
        vec![],
    );

    assert!(result.is_ok());

    let loaded = store.load_value("", "identities").unwrap().unwrap();
    let loaded_map: HashMap<String, IIdentityData> = serde_json::from_value(loaded).unwrap();
    assert_eq!(loaded_map.get("high_rev_id").unwrap().revision, u32::MAX);
}

#[test]
fn test_update_identity_with_many_public_keys() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let mut identities = HashMap::new();
    identities.insert(
        "many_keys_id".to_string(),
        create_test_identity("many_keys_id"),
    );
    store
        .save_value("", "identities", serde_json::to_value(&identities).unwrap())
        .unwrap();

    let many_keys: Vec<IIdentityPublicKey> = (0..10)
        .map(|i| IIdentityPublicKey {
            id: i,
            type_: "ECDSA_SECP256K1".to_string(),
            purpose: i % 4,
            security_level: i % 3,
            data: format!("0xkey{}", i),
            read_only: i % 2 == 0,
            disabled_at: if i % 3 == 0 {
                Some("2024-01-01".to_string())
            } else {
                None
            },
        })
        .collect();

    let result = update_identity_with_sdk_data_logic(
        &store,
        "testnet".to_string(),
        "many_keys_id".to_string(),
        many_keys.clone(),
        1,
        (0..10).collect(),
    );

    assert!(result.is_ok());

    let loaded = store.load_value("", "identities").unwrap().unwrap();
    let loaded_map: HashMap<String, IIdentityData> = serde_json::from_value(loaded).unwrap();
    let updated = loaded_map.get("many_keys_id").unwrap();
    assert_eq!(updated.public_keys.len(), 10);
}
