// src-tauri/src/integration_tests.rs

//! Integration tests exercising _logic functions and StoreManager
//! with tauri::test::mock_builder() for a real AppHandle.
//!
//! NOTE: The #[tauri::command] wrappers use `tauri::AppHandle` which
//! is hardcoded to `AppHandle<Wry>`. To test those directly, each
//! command function signature would need to be generic:
//!   `fn cmd<R: Runtime>(app: AppHandle<R>, ...) -> ...`
//! That refactor is tracked separately. For now, coverage is maximized
//! by exhaustively testing every branch in _logic functions.

use crate::commands::asset_commands;
use crate::commands::identity_commands;
use crate::commands::identity_details_commands;
use crate::commands::license_commands;
use crate::commands::mnemonic_commands;
use crate::commands::settings_commands;
use crate::identity::storage;
use crate::models::*;
use crate::utils::{PersistentStore, StoreManager};
use tauri::test::MockRuntime;

/// Build a minimal Tauri app with the store plugin for testing.
fn mock_app() -> tauri::App<MockRuntime> {
    tauri::test::mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(tauri::generate_context!())
        .expect("failed to build mock app")
}

// =====================================================
// StoreManager + PersistentStore trait impl coverage
// =====================================================

#[test]
fn test_store_manager_save_and_load_value() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let val = serde_json::json!({"key": "value", "num": 42});
    manager
        .save_value("test_integration.json", "test_key", val.clone())
        .expect("save_value failed");

    let loaded = manager
        .load_value("test_integration.json", "test_key")
        .expect("load_value failed");
    assert!(loaded.is_some());
    assert_eq!(loaded.unwrap(), val);
}

#[test]
fn test_store_manager_delete_value() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let val = serde_json::json!("to_delete");
    manager.save_value("test_del.json", "del_key", val).unwrap();
    manager.delete_value("test_del.json", "del_key").unwrap();

    let loaded = manager.load_value("test_del.json", "del_key").unwrap();
    assert!(loaded.is_none());
}

#[test]
fn test_store_manager_load_data_typed() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: None,
    };
    manager
        .save_data("test_typed.json", "settings", &settings)
        .unwrap();

    let loaded: Option<IAppSettings> = manager.load_data("test_typed.json", "settings").unwrap();
    assert!(loaded.is_some());
    assert_eq!(loaded.unwrap().theme, "dark");
}

#[test]
fn test_store_manager_load_returns_none_for_missing() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let loaded = manager
        .load_value("nonexistent_file.json", "no_key")
        .unwrap();
    assert!(loaded.is_none());
}

#[test]
fn test_store_manager_convenience_methods() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let data = INotificationSettings {
        messages: true,
        mentions: false,
        contact_requests: true,
    };
    manager.save("conv.json", "notif", &data).unwrap();

    let loaded: Option<INotificationSettings> = manager.load("conv.json", "notif").unwrap();
    assert!(loaded.is_some());
    assert!(loaded.unwrap().messages);

    manager.delete("conv.json", "notif").unwrap();
    let after: Option<INotificationSettings> = manager.load("conv.json", "notif").unwrap();
    assert!(after.is_none());
}

#[test]
fn test_store_manager_overwrite_value() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    manager
        .save_value("overwrite.json", "k", serde_json::json!(1))
        .unwrap();
    manager
        .save_value("overwrite.json", "k", serde_json::json!(2))
        .unwrap();

    let loaded = manager.load_value("overwrite.json", "k").unwrap();
    assert_eq!(loaded.unwrap(), serde_json::json!(2));
}

#[test]
fn test_store_manager_multiple_keys_same_file() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    manager
        .save_value("multi.json", "a", serde_json::json!("alpha"))
        .unwrap();
    manager
        .save_value("multi.json", "b", serde_json::json!("beta"))
        .unwrap();

    assert_eq!(
        manager.load_value("multi.json", "a").unwrap().unwrap(),
        serde_json::json!("alpha")
    );
    assert_eq!(
        manager.load_value("multi.json", "b").unwrap().unwrap(),
        serde_json::json!("beta")
    );

    manager.delete_value("multi.json", "a").unwrap();
    assert!(manager.load_value("multi.json", "a").unwrap().is_none());
    assert!(manager.load_value("multi.json", "b").unwrap().is_some());
}

#[test]
fn test_store_manager_complex_nested_data() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let val = serde_json::json!({
        "level1": {
            "level2": {
                "level3": [1, 2, 3]
            }
        }
    });
    manager
        .save_value("nested.json", "deep", val.clone())
        .unwrap();
    let loaded = manager.load_value("nested.json", "deep").unwrap();
    assert_eq!(loaded.unwrap(), val);
}

// =====================================================
// Settings commands — exhaustive branch coverage
// =====================================================

#[test]
fn test_settings_full_lifecycle() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    // Load from empty store
    let empty = settings_commands::load_settings_logic(&manager).unwrap();
    assert!(empty.is_none());

    // Save with all fields populated
    let settings = IAppSettings {
        network: "mainnet".to_string(),
        theme: "light".to_string(),
        notifications: INotificationSettings {
            messages: true,
            mentions: true,
            contact_requests: false,
        },
        profile: IProfileSettings {
            display_name: "Alice".into(),
            username: "alice123".into(),
            bio: "Hello world".into(),
        },
        active_identity_id: Some("active_123".into()),
    };
    settings_commands::save_settings_logic(&manager, settings).unwrap();

    // Load and verify every field
    let loaded = settings_commands::load_settings_logic(&manager)
        .unwrap()
        .unwrap();
    assert_eq!(loaded.network, "mainnet");
    assert_eq!(loaded.theme, "light");
    assert!(loaded.notifications.messages);
    assert!(loaded.notifications.mentions);
    assert!(!loaded.notifications.contact_requests);
    assert_eq!(loaded.profile.display_name, "Alice");
    assert_eq!(loaded.profile.username, "alice123");
    assert_eq!(loaded.profile.bio, "Hello world");
    assert_eq!(loaded.active_identity_id, Some("active_123".into()));

    // Overwrite
    let settings2 = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: None,
    };
    settings_commands::save_settings_logic(&manager, settings2).unwrap();
    let loaded2 = settings_commands::load_settings_logic(&manager)
        .unwrap()
        .unwrap();
    assert_eq!(loaded2.network, "testnet");
    assert_eq!(loaded2.theme, "dark");
    assert!(loaded2.active_identity_id.is_none());

    // Delete
    settings_commands::delete_settings_logic(&manager).unwrap();
    let after = settings_commands::load_settings_logic(&manager).unwrap();
    assert!(after.is_none());

    // Delete again (idempotent)
    settings_commands::delete_settings_logic(&manager).unwrap();
}

// =====================================================
// Mnemonic commands — all branches
// =====================================================

#[test]
fn test_mnemonic_testnet_full_lifecycle() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    // Load from empty
    let empty = mnemonic_commands::load_mnemonic_logic(&manager, "testnet".into()).unwrap();
    assert!(empty.is_none());

    // Save
    let mnemonic = IMnemonic {
        seed_phrase:
            "abandon ability able about above absent absorb abstract absurd abuse access accident"
                .to_string(),
    };
    mnemonic_commands::save_mnemonic_logic(&manager, "testnet".into(), mnemonic).unwrap();

    // Load back
    let loaded = mnemonic_commands::load_mnemonic_logic(&manager, "testnet".into())
        .unwrap()
        .unwrap();
    assert!(loaded.seed_phrase.starts_with("abandon"));

    // Overwrite
    let mnemonic2 = IMnemonic {
        seed_phrase: "zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong".to_string(),
    };
    mnemonic_commands::save_mnemonic_logic(&manager, "testnet".into(), mnemonic2).unwrap();
    let loaded2 = mnemonic_commands::load_mnemonic_logic(&manager, "testnet".into())
        .unwrap()
        .unwrap();
    assert!(loaded2.seed_phrase.starts_with("zoo"));

    // Delete
    mnemonic_commands::delete_mnemonic_logic(&manager, "testnet".into()).unwrap();
    let after = mnemonic_commands::load_mnemonic_logic(&manager, "testnet".into()).unwrap();
    assert!(after.is_none());
}

#[test]
fn test_mnemonic_mainnet_full_lifecycle() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let mnemonic = IMnemonic {
        seed_phrase: "mainnet seed phrase for testing".to_string(),
    };
    mnemonic_commands::save_mnemonic_logic(&manager, "mainnet".into(), mnemonic).unwrap();

    let loaded = mnemonic_commands::load_mnemonic_logic(&manager, "mainnet".into())
        .unwrap()
        .unwrap();
    assert_eq!(loaded.seed_phrase, "mainnet seed phrase for testing");

    mnemonic_commands::delete_mnemonic_logic(&manager, "mainnet".into()).unwrap();
    let after = mnemonic_commands::load_mnemonic_logic(&manager, "mainnet".into()).unwrap();
    assert!(after.is_none());
}

#[test]
fn test_mnemonic_delete_from_empty() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    // Should not error
    mnemonic_commands::delete_mnemonic_logic(&manager, "testnet".into()).unwrap();
}

// =====================================================
// License commands — all branches
// =====================================================

#[test]
fn test_license_full_lifecycle() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    // Load from empty
    let empty = license_commands::load_license_logic(&manager, "nonexistent".into()).unwrap();
    assert!(empty.is_none());

    // Save premium license
    let license = ILicense {
        success: true,
        identity_id: "lic_full_id".to_string(),
        txid: "tx_full".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: Some("1700000001".to_string()),
    };
    license_commands::save_license_logic(&manager, license).unwrap();

    // Load and verify all fields
    let loaded = license_commands::load_license_logic(&manager, "lic_full_id".into())
        .unwrap()
        .unwrap();
    assert!(loaded.success);
    assert_eq!(loaded.identity_id, "lic_full_id");
    assert_eq!(loaded.txid, "tx_full");
    assert!(loaded.is_premium);
    assert_eq!(loaded.created_at, "1700000000");
    assert_eq!(loaded.expires_at, "2000000000");
    assert_eq!(loaded.updated_at, Some("1700000001".to_string()));

    // Save non-premium license (different id)
    let license2 = ILicense {
        success: false,
        identity_id: "lic_np_id".to_string(),
        txid: "".to_string(),
        is_premium: false,
        created_at: "0".to_string(),
        expires_at: "0".to_string(),
        updated_at: None,
    };
    license_commands::save_license_logic(&manager, license2).unwrap();

    // Both exist
    assert!(
        license_commands::load_license_logic(&manager, "lic_full_id".into())
            .unwrap()
            .is_some()
    );
    let np = license_commands::load_license_logic(&manager, "lic_np_id".into())
        .unwrap()
        .unwrap();
    assert!(!np.is_premium);
    assert!(!np.success);

    // Update existing license
    let updated = ILicense {
        success: true,
        identity_id: "lic_full_id".to_string(),
        txid: "tx_updated".to_string(),
        is_premium: false,
        created_at: "1700000000".to_string(),
        expires_at: "2100000000".to_string(),
        updated_at: Some("1800000000".to_string()),
    };
    license_commands::save_license_logic(&manager, updated).unwrap();
    let reloaded = license_commands::load_license_logic(&manager, "lic_full_id".into())
        .unwrap()
        .unwrap();
    assert_eq!(reloaded.txid, "tx_updated");
    assert!(!reloaded.is_premium);

    // Delete one
    license_commands::delete_license_logic(&manager, "lic_full_id".into()).unwrap();
    assert!(
        license_commands::load_license_logic(&manager, "lic_full_id".into())
            .unwrap()
            .is_none()
    );
    // Other still exists
    assert!(
        license_commands::load_license_logic(&manager, "lic_np_id".into())
            .unwrap()
            .is_some()
    );

    // Delete the other
    license_commands::delete_license_logic(&manager, "lic_np_id".into()).unwrap();
    assert!(
        license_commands::load_license_logic(&manager, "lic_np_id".into())
            .unwrap()
            .is_none()
    );

    // Delete nonexistent (should not error)
    license_commands::delete_license_logic(&manager, "ghost".into()).unwrap();
}

// =====================================================
// Asset commands — all branches
// =====================================================

#[test]
fn test_asset_full_lifecycle_testnet() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    // Load from empty
    let empty =
        asset_commands::load_assets_logic(&manager, "empty_id".into(), "testnet".into()).unwrap();
    assert!(empty.is_empty());

    // Save multiple assets for one identity
    let assets = vec![
        IAssetDefinition {
            identity_id: "asset_id_1".into(),
            name: "TestCoin".into(),
            symbol: "TC".into(),
            balance: Some("1000".into()),
            asset_id: Some("contract_1".into()),
            decimals: Some(8),
            network: Some("testnet".into()),
        },
        IAssetDefinition {
            identity_id: "asset_id_1".into(),
            name: "AnotherToken".into(),
            symbol: "AT".into(),
            balance: Some("500".into()),
            asset_id: Some("contract_2".into()),
            decimals: Some(18),
            network: Some("testnet".into()),
        },
    ];
    asset_commands::save_assets_logic(&manager, "asset_id_1".into(), "testnet".into(), assets)
        .unwrap();

    // Load back
    let loaded =
        asset_commands::load_assets_logic(&manager, "asset_id_1".into(), "testnet".into()).unwrap();
    assert_eq!(loaded.len(), 2);

    // Save for different identity
    let assets2 = vec![IAssetDefinition {
        identity_id: "asset_id_2".into(),
        name: "CoinB".into(),
        symbol: "CB".into(),
        balance: Some("200".into()),
        asset_id: Some("contract_3".into()),
        decimals: Some(8),
        network: Some("testnet".into()),
    }];
    asset_commands::save_assets_logic(&manager, "asset_id_2".into(), "testnet".into(), assets2)
        .unwrap();

    // Both exist independently
    assert_eq!(
        asset_commands::load_assets_logic(&manager, "asset_id_1".into(), "testnet".into())
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        asset_commands::load_assets_logic(&manager, "asset_id_2".into(), "testnet".into())
            .unwrap()
            .len(),
        1
    );

    // Overwrite first identity's assets
    let assets3 = vec![IAssetDefinition {
        identity_id: "asset_id_1".into(),
        name: "ReplacedCoin".into(),
        symbol: "RC".into(),
        balance: Some("9999".into()),
        asset_id: Some("contract_new".into()),
        decimals: Some(6),
        network: Some("testnet".into()),
    }];
    asset_commands::save_assets_logic(&manager, "asset_id_1".into(), "testnet".into(), assets3)
        .unwrap();
    let reloaded =
        asset_commands::load_assets_logic(&manager, "asset_id_1".into(), "testnet".into()).unwrap();
    assert_eq!(reloaded.len(), 1);
    assert_eq!(reloaded[0].name, "ReplacedCoin");

    // Save empty list
    asset_commands::save_assets_logic(&manager, "asset_id_1".into(), "testnet".into(), vec![])
        .unwrap();
    let empty_after =
        asset_commands::load_assets_logic(&manager, "asset_id_1".into(), "testnet".into()).unwrap();
    assert!(empty_after.is_empty());

    // Delete all assets for network
    asset_commands::delete_assets_logic(&manager, "testnet".into()).unwrap();

    assert!(
        asset_commands::load_assets_logic(&manager, "asset_id_1".into(), "testnet".into())
            .unwrap()
            .is_empty()
    );
    assert!(
        asset_commands::load_assets_logic(&manager, "asset_id_2".into(), "testnet".into())
            .unwrap()
            .is_empty()
    );
}

#[test]
fn test_asset_mainnet_lifecycle() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let assets = vec![IAssetDefinition {
        identity_id: "mn_id".into(),
        name: "MainCoin".into(),
        symbol: "MC".into(),
        balance: Some("50000".into()),
        asset_id: Some("mn_contract".into()),
        decimals: Some(8),
        network: Some("mainnet".into()),
    }];
    asset_commands::save_assets_logic(&manager, "mn_id".into(), "mainnet".into(), assets).unwrap();

    let loaded =
        asset_commands::load_assets_logic(&manager, "mn_id".into(), "mainnet".into()).unwrap();
    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded[0].symbol, "MC");
    assert_eq!(loaded[0].balance, Some("50000".into()));
    assert_eq!(loaded[0].decimals, Some(8));

    asset_commands::delete_assets_logic(&manager, "mainnet".into()).unwrap();
}

#[test]
fn test_asset_delete_from_empty() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    asset_commands::delete_assets_logic(&manager, "testnet".into()).unwrap();
}

#[test]
fn test_asset_with_optional_fields_none() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let assets = vec![IAssetDefinition {
        identity_id: "opt_id".into(),
        name: "MinCoin".into(),
        symbol: "MIN".into(),
        balance: None,
        asset_id: None,
        decimals: None,
        network: None,
    }];
    asset_commands::save_assets_logic(&manager, "opt_id".into(), "testnet".into(), assets).unwrap();

    let loaded =
        asset_commands::load_assets_logic(&manager, "opt_id".into(), "testnet".into()).unwrap();
    assert_eq!(loaded.len(), 1);
    assert!(loaded[0].balance.is_none());
    assert!(loaded[0].asset_id.is_none());
    assert!(loaded[0].decimals.is_none());
    assert!(loaded[0].network.is_none());
}

// =====================================================
// Identity commands — all branches
// =====================================================

#[tokio::test]
async fn test_identity_save_load_active_testnet() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    // Save first identity
    let payload1 = identity_commands::ISaveIdentityPayload {
        identity_id: "id_1".into(),
        username: "user_1".into(),
        balance: "500".into(),
        revision: 1,
        public_keys: vec![],
        ..Default::default()
    };
    identity_commands::save_identity_logic(&manager, "testnet".into(), payload1)
        .await
        .unwrap();

    let active = identity_commands::load_active_identity_logic(&manager, "testnet".into()).unwrap();
    assert_eq!(active.active_identity_id, Some("id_1".to_string()));
    assert!(active.identity.is_some());
    assert!(active.identity_count >= 1);

    // Save second identity with public keys as IAnyValue
    let pk = serde_json::json!({
        "id": 0,
        "type": "ECDSA_SECP256K1",
        "purpose": 0,
        "securityLevel": 0,
        "data": "aabbccdd",
        "readOnly": false
    });
    let payload2 = identity_commands::ISaveIdentityPayload {
        identity_id: "id_2".into(),
        username: "user_2".into(),
        balance: "1000".into(),
        revision: 3,
        public_keys: vec![IAnyValue(pk)],
        ..Default::default()
    };
    identity_commands::save_identity_logic(&manager, "testnet".into(), payload2)
        .await
        .unwrap();

    let active2 =
        identity_commands::load_active_identity_logic(&manager, "testnet".into()).unwrap();
    assert!(active2.identity_count >= 2);
}

#[tokio::test]
async fn test_identity_save_load_active_mainnet() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "mn_id_1".into(),
        username: "mn_user".into(),
        balance: "2000".into(),
        revision: 5,
        public_keys: vec![],
        ..Default::default()
    };
    identity_commands::save_identity_logic(&manager, "mainnet".into(), payload)
        .await
        .unwrap();

    let active = identity_commands::load_active_identity_logic(&manager, "mainnet".into()).unwrap();
    assert_eq!(active.active_identity_id, Some("mn_id_1".to_string()));
}

#[test]
fn test_identity_load_identities_map() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    // Empty map
    let empty_map =
        identity_commands::load_identities_map_logic(&manager, "testnet".into()).unwrap();
    assert!(empty_map.0.is_object() || empty_map.0.is_null());

    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.block_on(async {
        let p1 = identity_commands::ISaveIdentityPayload {
            identity_id: "map_a".into(),
            username: "alice".into(),
            balance: "100".into(),
            revision: 1,
            public_keys: vec![],
            ..Default::default()
        };
        identity_commands::save_identity_logic(&manager, "testnet".into(), p1)
            .await
            .unwrap();

        let p2 = identity_commands::ISaveIdentityPayload {
            identity_id: "map_b".into(),
            username: "bob".into(),
            balance: "200".into(),
            revision: 2,
            public_keys: vec![],
            ..Default::default()
        };
        identity_commands::save_identity_logic(&manager, "testnet".into(), p2)
            .await
            .unwrap();
    });

    let map = identity_commands::load_identities_map_logic(&manager, "testnet".into()).unwrap();
    let obj = map.0.as_object().unwrap();
    assert!(obj.contains_key("map_a"));
    assert!(obj.contains_key("map_b"));
}

#[tokio::test]
async fn test_identity_save_keys_and_load_keystore() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    // Save identity first with a public key as IAnyValue
    let pk = serde_json::json!({
        "id": 0,
        "type": "ECDSA_SECP256K1",
        "purpose": 0,
        "securityLevel": 0,
        "data": "pubkey_data",
        "readOnly": false
    });
    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "ks_id".into(),
        username: "ks_user".into(),
        balance: "0".into(),
        revision: 1,
        public_keys: vec![IAnyValue(pk)],
        ..Default::default()
    };
    identity_commands::save_identity_logic(&manager, "testnet".into(), payload)
        .await
        .unwrap();

    // Save keys
    let keys = vec![
        IPrivateKeyEntry {
            identity_id: "ks_id".into(),
            key_id: 0,
            private_key: "wif_key_0".into(),
            ..Default::default()
        },
        IPrivateKeyEntry {
            identity_id: "ks_id".into(),
            key_id: 1,
            private_key: "wif_key_1".into(),
            ..Default::default()
        },
    ];
    identity_commands::save_keys_logic(&manager, "testnet".into(), "ks_id".into(), keys)
        .await
        .unwrap();

    // Load keystore
    let ks = identity_commands::load_keystore_logic(&manager, "testnet".into()).unwrap();
    assert!(ks.0.is_object());
}

#[tokio::test]
async fn test_identity_save_keys_empty() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "ks_empty_id".into(),
        username: "ks_empty".into(),
        balance: "0".into(),
        revision: 1,
        public_keys: vec![],
        ..Default::default()
    };
    identity_commands::save_identity_logic(&manager, "testnet".into(), payload)
        .await
        .unwrap();

    identity_commands::save_keys_logic(&manager, "testnet".into(), "ks_empty_id".into(), vec![])
        .await
        .unwrap();
}

#[tokio::test]
async fn test_identity_save_identity_with_keys() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let pk = serde_json::json!({
        "id": 0,
        "type": "ECDSA_SECP256K1",
        "purpose": 0,
        "securityLevel": 0,
        "data": "aabb",
        "readOnly": false
    });
    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "wk_id".into(),
        username: "wk_user".into(),
        balance: "1000".into(),
        revision: 3,
        public_keys: vec![IAnyValue(pk)],
        ..Default::default()
    };
    let private_keys = vec![IPrivateKeyEntry {
        identity_id: "wk_id".into(),
        key_id: 0,
        private_key: "wif_wk".into(),
        ..Default::default()
    }];

    identity_commands::save_identity_with_keys_logic(
        &manager,
        "testnet".into(),
        payload,
        private_keys,
    )
    .await
    .unwrap();

    let active = identity_commands::load_active_identity_logic(&manager, "testnet".into()).unwrap();
    assert_eq!(active.active_identity_id, Some("wk_id".to_string()));
}

#[tokio::test]
async fn test_identity_delete_specific() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "del_specific".into(),
        username: "del_user".into(),
        balance: "0".into(),
        revision: 1,
        public_keys: vec![],
        ..Default::default()
    };
    identity_commands::save_identity_logic(&manager, "testnet".into(), payload)
        .await
        .unwrap();

    let del = identity_commands::delete_identity_logic(
        &manager,
        "testnet".into(),
        Some("del_specific".into()),
    )
    .unwrap();
    assert!(del);

    let del2 = identity_commands::delete_identity_logic(
        &manager,
        "testnet".into(),
        Some("nonexistent".into()),
    )
    .unwrap();
    assert!(!del2);
}

#[tokio::test]
async fn test_identity_delete_all_with_none() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "del_all".into(),
        username: "del_all_user".into(),
        balance: "0".into(),
        revision: 1,
        public_keys: vec![],
        ..Default::default()
    };
    identity_commands::save_identity_logic(&manager, "testnet".into(), payload)
        .await
        .unwrap();

    let del = identity_commands::delete_identity_logic(&manager, "testnet".into(), None).unwrap();
    assert!(del);
}

#[tokio::test]
async fn test_identity_with_multiple_public_keys() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let pk0 = serde_json::json!({
        "id": 0,
        "type": "ECDSA_SECP256K1",
        "purpose": 0,
        "securityLevel": 0,
        "data": "key0data",
        "readOnly": false
    });
    let pk1 = serde_json::json!({
        "id": 1,
        "type": "BLS12_381",
        "purpose": 3,
        "securityLevel": 2,
        "data": "key1data",
        "readOnly": true
    });
    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "full_id".into(),
        username: "full_user".into(),
        balance: "999999".into(),
        revision: 42,
        public_keys: vec![IAnyValue(pk0), IAnyValue(pk1)],
        ..Default::default()
    };
    identity_commands::save_identity_logic(&manager, "testnet".into(), payload)
        .await
        .unwrap();

    let active = identity_commands::load_active_identity_logic(&manager, "testnet".into()).unwrap();
    assert!(active.identity.is_some());
}

// =====================================================
// Identity details commands — all branches
// =====================================================

#[test]
fn test_identity_details_update_and_get_keys() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let mut map = std::collections::HashMap::new();
    map.insert(
        "detail_id".to_string(),
        IIdentityData {
            identity_id: "detail_id".into(),
            username: "detail_user".into(),
            balance: "100".into(),
            revision: 1,
            ..Default::default()
        },
    );
    storage::save_identity_map_internal(&manager, "testnet", &map, None).unwrap();

    identity_details_commands::update_identity_with_sdk_data_logic(
        &manager,
        "testnet".into(),
        "detail_id".into(),
        vec![
            IIdentityPublicKey {
                id: 0,
                type_: "ECDSA_SECP256K1".into(),
                purpose: 0,
                security_level: 0,
                data: "aabb".into(),
                read_only: false,
                disabled_at: None,
            },
            IIdentityPublicKey {
                id: 1,
                type_: "BLS12_381".into(),
                purpose: 3,
                security_level: 1,
                data: "ccdd".into(),
                read_only: true,
                disabled_at: None,
            },
        ],
        10,
        vec![0, 1],
    )
    .unwrap();

    let keys = identity_details_commands::get_identity_public_keys_logic(
        &manager,
        "testnet".into(),
        "detail_id".into(),
    )
    .unwrap();
    assert!(keys.is_some());
    assert_eq!(keys.unwrap().len(), 2);

    let none_keys = identity_details_commands::get_identity_public_keys_logic(
        &manager,
        "testnet".into(),
        "nonexistent_id".into(),
    )
    .unwrap();
    assert!(none_keys.is_none());

    identity_details_commands::delete_identity_public_keys_logic(
        &manager,
        "testnet".into(),
        "detail_id".into(),
    )
    .unwrap();

    let after = identity_details_commands::get_identity_public_keys_logic(
        &manager,
        "testnet".into(),
        "detail_id".into(),
    )
    .unwrap();
    assert!(after.is_none() || after.unwrap().is_empty());
}

#[test]
fn test_identity_details_update_nonexistent_identity() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let result = identity_details_commands::update_identity_with_sdk_data_logic(
        &manager,
        "testnet".into(),
        "ghost_id".into(),
        vec![],
        1,
        vec![],
    );
    let _ = result;
}

#[test]
fn test_identity_details_mainnet() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let mut map = std::collections::HashMap::new();
    map.insert(
        "mn_detail".to_string(),
        IIdentityData {
            identity_id: "mn_detail".into(),
            username: "mn_user".into(),
            balance: "500".into(),
            revision: 2,
            ..Default::default()
        },
    );
    storage::save_identity_map_internal(&manager, "mainnet", &map, None).unwrap();

    identity_details_commands::update_identity_with_sdk_data_logic(
        &manager,
        "mainnet".into(),
        "mn_detail".into(),
        vec![IIdentityPublicKey {
            id: 0,
            type_: "ECDSA_SECP256K1".into(),
            purpose: 0,
            security_level: 0,
            data: "mainnet_key".into(),
            read_only: false,
            disabled_at: None,
        }],
        3,
        vec![0],
    )
    .unwrap();

    let keys = identity_details_commands::get_identity_public_keys_logic(
        &manager,
        "mainnet".into(),
        "mn_detail".into(),
    )
    .unwrap();
    assert!(keys.is_some());
    assert_eq!(keys.unwrap().len(), 1);
}

#[test]
fn test_identity_details_delete_nonexistent() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    // Deleting keys for a nonexistent identity returns an error
    let result = identity_details_commands::delete_identity_public_keys_logic(
        &manager,
        "testnet".into(),
        "nonexistent".into(),
    );
    assert!(result.is_err());
}

#[test]
fn test_identity_details_empty_keys_update() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let mut map = std::collections::HashMap::new();
    map.insert(
        "empty_keys_id".to_string(),
        IIdentityData {
            identity_id: "empty_keys_id".into(),
            username: "ek_user".into(),
            balance: "0".into(),
            revision: 1,
            ..Default::default()
        },
    );
    storage::save_identity_map_internal(&manager, "testnet", &map, None).unwrap();

    identity_details_commands::update_identity_with_sdk_data_logic(
        &manager,
        "testnet".into(),
        "empty_keys_id".into(),
        vec![],
        5,
        vec![],
    )
    .unwrap();
}

// =====================================================
// Identity storage AppHandle wrappers
// =====================================================

#[test]
fn test_identity_storage_apphandle_wrappers() {
    let app = mock_app();
    let handle = app.handle();

    let mut map = std::collections::HashMap::new();
    map.insert(
        "wrap_id".to_string(),
        IIdentityData {
            identity_id: "wrap_id".into(),
            username: "wrap_user".into(),
            balance: "0".into(),
            ..Default::default()
        },
    );

    storage::save_identity_map(handle, "testnet", &map, Some("wrap_id".into())).unwrap();
    let loaded = storage::load_identity_map(handle, "testnet").unwrap();
    assert!(loaded.contains_key("wrap_id"));

    let keystore = IPrivateKeyStore::default();
    storage::save_keystore(handle, "testnet", &keystore).unwrap();
    let loaded_ks = storage::load_keystore(handle, "testnet").unwrap();
    assert_eq!(loaded_ks, IPrivateKeyStore::default());
}

#[test]
fn test_identity_storage_mainnet_wrappers() {
    let app = mock_app();
    let handle = app.handle();

    let mut map = std::collections::HashMap::new();
    map.insert(
        "mn_wrap".to_string(),
        IIdentityData {
            identity_id: "mn_wrap".into(),
            username: "mn_wrap_user".into(),
            balance: "1000".into(),
            ..Default::default()
        },
    );
    storage::save_identity_map(handle, "mainnet", &map, Some("mn_wrap".into())).unwrap();
    let loaded = storage::load_identity_map(handle, "mainnet").unwrap();
    assert!(loaded.contains_key("mn_wrap"));
}

#[test]
fn test_identity_storage_active_marker_operations() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let mut map = std::collections::HashMap::new();
    map.insert(
        "marker_a".to_string(),
        IIdentityData {
            identity_id: "marker_a".into(),
            username: "marker_user_a".into(),
            balance: "0".into(),
            ..Default::default()
        },
    );
    map.insert(
        "marker_b".to_string(),
        IIdentityData {
            identity_id: "marker_b".into(),
            username: "marker_user_b".into(),
            balance: "0".into(),
            ..Default::default()
        },
    );
    storage::save_identity_map_internal(&manager, "testnet", &map, Some("marker_b".into()))
        .unwrap();

    let marker = storage::load_active_marker_internal(&manager, "testnet").unwrap();
    assert_eq!(marker, Some("marker_b".to_string()));

    storage::save_identity_map_internal(&manager, "testnet", &map, None).unwrap();
    let marker2 = storage::load_active_marker_internal(&manager, "testnet").unwrap();
    assert_eq!(marker2, Some("marker_b".to_string()));

    storage::clear_active_marker_internal(&manager, "testnet").unwrap();
    let marker3 = storage::load_active_marker_internal(&manager, "testnet").unwrap();
    assert!(marker3.is_none());
}

// =====================================================
// Menu setup
// =====================================================

#[test]
#[cfg(not(target_os = "macos"))]
fn test_menu_setup_with_mock_app() {
    let app = mock_app();
    let handle = app.handle();
    let result = crate::menu::setup_menus(handle);
    assert!(result.is_ok());
}

// =====================================================
// setup_environment
// =====================================================

#[test]
fn test_setup_environment_integration() {
    crate::setup_environment();
    #[cfg(target_os = "linux")]
    {
        assert_eq!(
            std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").unwrap(),
            "1"
        );
        assert_eq!(std::env::var("TOUCH_LEAN_MODE").unwrap(), "0");
    }
}

// =====================================================
// Constants
// =====================================================

#[test]
fn test_constants_get_evonext_contract_id() {
    use crate::constants::get_evonext_contract_id;
    use crate::dapi::types::Network;

    let mainnet_id = get_evonext_contract_id(Network::Mainnet);
    let testnet_id = get_evonext_contract_id(Network::Testnet);
    assert!(!mainnet_id.is_empty());
    assert!(!testnet_id.is_empty());
}

// Add to the end of integration_tests.rs, inside the file

#[test]
fn test_settings_command_wrapper_generic() {
    let app = mock_app();
    let handle = app.handle();

    let settings = IAppSettings {
        network: "mainnet".to_string(),
        theme: "light".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: Some("wrapper_test_id".into()),
    };

    // Call the actual #[tauri::command] wrapper with MockRuntime
    let save_res = settings_commands::save_settings(handle.clone(), settings);
    assert!(save_res.error.is_none());

    let load_res = settings_commands::load_settings(handle.clone());
    assert!(load_res.error.is_none());
    let loaded = load_res.data.flatten().unwrap();
    assert_eq!(loaded.network, "mainnet");
    assert_eq!(loaded.active_identity_id, Some("wrapper_test_id".into()));

    let del_res = settings_commands::delete_settings(handle.clone());
    assert!(del_res.error.is_none());

    let after = settings_commands::load_settings(handle.clone());
    assert!(after.data.flatten().is_none());
}
