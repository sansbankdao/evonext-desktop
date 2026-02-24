// src-tauri/src/integration_tests.rs

//! Integration tests that exercise #[tauri::command] wrappers and StoreManager
//! using tauri::test::mock_builder() to provide a real AppHandle.

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
    manager
        .save_value("test_del.json", "del_key", val)
        .unwrap();
    manager
        .delete_value("test_del.json", "del_key")
        .unwrap();

    let loaded = manager
        .load_value("test_del.json", "del_key")
        .unwrap();
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

    let loaded: Option<IAppSettings> = manager
        .load_data("test_typed.json", "settings")
        .unwrap();
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

    let loaded: Option<INotificationSettings> =
        manager.load("conv.json", "notif").unwrap();
    assert!(loaded.is_some());
    assert!(loaded.unwrap().messages);

    manager.delete("conv.json", "notif").unwrap();
    let after: Option<INotificationSettings> =
        manager.load("conv.json", "notif").unwrap();
    assert!(after.is_none());
}

// =====================================================
// Settings commands (inner function coverage)
// =====================================================

#[test]
fn test_settings_inner_functions() {
    let app = mock_app();
    let handle = app.handle().clone();

    let settings = IAppSettings {
        network: "mainnet".to_string(),
        theme: "light".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: None,
    };

    settings_commands::save_settings_inner(handle.clone(), settings).unwrap();
    let loaded = settings_commands::load_settings_inner(handle.clone()).unwrap();
    assert!(loaded.is_some());
    assert_eq!(loaded.unwrap().network, "mainnet");

    settings_commands::delete_settings_inner(handle).unwrap();
}

// =====================================================
// Mnemonic commands (logic coverage via store)
// =====================================================

#[test]
fn test_mnemonic_integration_via_store() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let mnemonic = IMnemonic {
        seed_phrase: "integration test phrase words here".to_string(),
    };

    mnemonic_commands::save_mnemonic_logic(&manager, "testnet".into(), mnemonic)
        .unwrap();

    let loaded = mnemonic_commands::load_mnemonic_logic(&manager, "testnet".into())
        .unwrap();
    assert!(loaded.is_some());
    assert_eq!(
        loaded.unwrap().seed_phrase,
        "integration test phrase words here"
    );

    mnemonic_commands::delete_mnemonic_logic(&manager, "testnet".into()).unwrap();

    let after = mnemonic_commands::load_mnemonic_logic(&manager, "testnet".into())
        .unwrap();
    assert!(after.is_none());
}

// =====================================================
// License commands (inner function coverage)
// =====================================================

#[tokio::test]
async fn test_license_inner_functions() {
    let app = mock_app();
    let handle = app.handle().clone();

    let license = ILicense {
        success: true,
        identity_id: "inner_lic_id".to_string(),
        txid: "tx".to_string(),
        is_premium: false,
        created_at: "0".to_string(),
        expires_at: "0".to_string(),
        updated_at: None,
    };

    license_commands::save_license_inner(handle.clone(), license).unwrap();

    let loaded =
        license_commands::load_license_inner(handle.clone(), "inner_lic_id".into())
            .await
            .unwrap();
    assert!(loaded.is_some());

    license_commands::delete_license_inner(handle, "inner_lic_id".into()).unwrap();
}

#[tokio::test]
async fn test_license_lifecycle_integration() {
    let app = mock_app();
    let handle = app.handle().clone();

    let license = ILicense {
        success: true,
        identity_id: "integ_license_id".to_string(),
        txid: "tx_integ".to_string(),
        is_premium: true,
        created_at: "1700000000".to_string(),
        expires_at: "2000000000".to_string(),
        updated_at: None,
    };

    license_commands::save_license_inner(handle.clone(), license).unwrap();

    let load_res = license_commands::load_license_inner(
        handle.clone(),
        "integ_license_id".into(),
    )
    .await
    .unwrap();
    assert!(load_res.is_some());
    assert!(load_res.unwrap().is_premium);

    license_commands::delete_license_inner(handle.clone(), "integ_license_id".into())
        .unwrap();

    let load_after = license_commands::load_license_inner(
        handle,
        "integ_license_id".into(),
    )
    .await
    .unwrap();
    assert!(load_after.is_none());
}

// =====================================================
// Identity commands (inner function coverage)
// =====================================================

#[tokio::test]
async fn test_identity_save_and_load_active_inner() {
    let app = mock_app();
    let handle = app.handle().clone();

    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "integ_id".into(),
        username: "integ_user".into(),
        balance: "500".into(),
        revision: 1,
        public_keys: vec![],
        ..Default::default()
    };

    identity_commands::save_identity_inner(
        handle.clone(),
        "testnet".into(),
        payload,
    )
    .await
    .unwrap();

    let manager = StoreManager::new(&handle);
    let active = identity_commands::load_active_identity_logic(&manager, "testnet".into())
        .unwrap();
    assert_eq!(active.active_identity_id, Some("integ_id".to_string()));
    assert!(active.identity.is_some());
    assert!(active.identity_count >= 1);
}

#[test]
fn test_identity_load_identities_map_inner() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "map_id_a".into(),
        username: "alice".into(),
        balance: "100".into(),
        revision: 1,
        public_keys: vec![],
        ..Default::default()
    };

    // Use the logic function directly
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        identity_commands::save_identity_logic(&manager, "testnet".into(), payload)
            .await
            .unwrap();
    });

    let map_res =
        identity_commands::load_identities_map_logic(&manager, "testnet".into())
            .unwrap();
    assert!(map_res.0.as_object().unwrap().contains_key("map_id_a"));
}

#[tokio::test]
async fn test_identity_save_keys_and_load_keystore_inner() {
    let app = mock_app();
    let handle = app.handle().clone();

    // First save an identity so the keystore enrichment can find it
    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "ks_id".into(),
        username: "ksuser".into(),
        balance: "0".into(),
        revision: 1,
        public_keys: vec![],
        ..Default::default()
    };
    identity_commands::save_identity_inner(
        handle.clone(),
        "testnet".into(),
        payload,
    )
    .await
    .unwrap();

    let keys = vec![IPrivateKeyEntry {
        identity_id: "ks_id".into(),
        key_id: 0,
        private_key: "wif_data".into(),
        ..Default::default()
    }];

    identity_commands::save_keys_inner(
        handle.clone(),
        "testnet".into(),
        "ks_id".into(),
        keys,
    )
    .await
    .unwrap();

    let ks = identity_commands::load_keystore_inner(handle, "testnet".into())
        .await
        .unwrap();
    assert!(ks.0.is_object());
}

#[tokio::test]
async fn test_identity_delete_inner() {
    let app = mock_app();
    let handle = app.handle().clone();

    let payload = identity_commands::ISaveIdentityPayload {
        identity_id: "del_id".into(),
        username: "deluser".into(),
        balance: "0".into(),
        revision: 1,
        public_keys: vec![],
        ..Default::default()
    };
    identity_commands::save_identity_inner(
        handle.clone(),
        "testnet".into(),
        payload,
    )
    .await
    .unwrap();

    let del = identity_commands::delete_identity_inner(
        handle.clone(),
        "testnet".into(),
        Some("del_id".into()),
    )
    .await
    .unwrap();
    assert!(del);

    // Delete nonexistent returns false
    let del2 = identity_commands::delete_identity_inner(
        handle.clone(),
        "testnet".into(),
        Some("ghost_id".into()),
    )
    .await
    .unwrap();
    assert!(!del2);

    // Delete with None => deletes the whole key
    let del3 = identity_commands::delete_identity_inner(
        handle,
        "testnet".into(),
        None,
    )
    .await
    .unwrap();
    assert!(del3);
}

// =====================================================
// Identity details commands (via store manager)
// =====================================================

#[test]
fn test_identity_details_update_via_store() {
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

    let res = identity_details_commands::update_identity_with_sdk_data_logic(
        &manager,
        "testnet".into(),
        "detail_id".into(),
        vec![IIdentityPublicKey {
            id: 0,
            type_: "ECDSA_SECP256K1".into(),
            purpose: 0,
            security_level: 0,
            data: "aabb".into(),
            read_only: false,
            disabled_at: None,
        }],
        5,
        vec![0],
    );
    assert!(res.is_ok());

    let keys = identity_details_commands::get_identity_public_keys_logic(
        &manager,
        "testnet".into(),
        "detail_id".into(),
    )
    .unwrap();
    assert!(keys.is_some());
    assert_eq!(keys.unwrap().len(), 1);

    identity_details_commands::delete_identity_public_keys_logic(
        &manager,
        "testnet".into(),
        "detail_id".into(),
    )
    .unwrap();
}

// =====================================================
// Asset commands (via store manager)
// =====================================================

#[test]
fn test_asset_integration_via_store() {
    let app = mock_app();
    let handle = app.handle();
    let manager = StoreManager::new(handle);

    let assets = vec![IAssetDefinition {
        identity_id: "asset_id".into(),
        name: "TestCoin".into(),
        symbol: "TC".into(),
        balance: Some("1000".into()),
        asset_id: Some("contract_id".into()),
        decimals: Some(8),
        network: Some("testnet".into()),
    }];

    asset_commands::save_assets_logic(&manager, "asset_id".into(), "testnet".into(), assets)
        .unwrap();

    let loaded =
        asset_commands::load_assets_logic(&manager, "asset_id".into(), "testnet".into())
            .unwrap();
    assert_eq!(loaded.len(), 1);

    asset_commands::delete_assets_logic(&manager, "testnet".into()).unwrap();
}

// =====================================================
// Identity storage pub wrappers (AppHandle versions)
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

    storage::save_identity_map(handle, "testnet", &map, Some("wrap_id".into()))
        .unwrap();
    let loaded = storage::load_identity_map(handle, "testnet").unwrap();
    assert!(loaded.contains_key("wrap_id"));

    let keystore = IPrivateKeyStore::default();
    storage::save_keystore(handle, "testnet", &keystore).unwrap();
    let loaded_ks = storage::load_keystore(handle, "testnet").unwrap();
    assert_eq!(loaded_ks, IPrivateKeyStore::default());
}

// =====================================================
// Menu setup (covers setup_menus with real AppHandle)
// =====================================================

#[test]
fn test_menu_setup_with_mock_app() {
    let app = mock_app();
    let handle = app.handle();
    let result = crate::menu::setup_menus(handle);
    assert!(result.is_ok());
}

// =====================================================
// setup_environment (covers lib.rs)
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
// Constants coverage (get_evonext_contract_id)
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
