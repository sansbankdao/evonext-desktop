// src-tauri/src/commands/identity_commands/tests.rs

use super::*;
use serde_json::json;
use tauri::test::{mock_builder, mock_context, MockRuntime, noop_assets};
use tauri::AppHandle;

#[test]
fn test_identity_mapper_discovery_regression() {
    let payload = ISaveIdentityPayload {
        identity_id: "test_id".into(),
        username: "user".into(),
        balance: "100".into(),
        public_keys: vec![IAnyValue(json!({ "id": 0, "data": "A1B2", "type": "ECDSA_SECP256K1" }))],
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert_eq!(result.identity_id, "test_id");
    assert_eq!(result.public_keys.len(), 1);
    assert_eq!(result.public_keys[0].data, "A1B2");
}
#[tokio::test]
async fn test_save_identity_with_keys_atomic() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(mock_context(noop_assets()))
        .unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();
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
    let res = save_identity_with_keys(
        handle.clone(),
        "testnet".into(),
        payload,
        keys
    ).await.unwrap();
    assert!(res.success);
    // Verify Identity File
    let identity_map = storage::load_identity_map(&handle, "testnet").unwrap();
    assert!(identity_map.contains_key(&identity_id));
    // Verify Safu File
    let keystore = storage::load_keystore(&handle, "testnet").unwrap();
    assert!(keystore.identities.contains_key(&identity_id));
    assert_eq!(keystore.identities.get(&identity_id).unwrap()[0].private_key, "wif_secret");
}
#[tokio::test]
async fn test_connect_identity_lifecycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(mock_context(noop_assets()))
        .unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let payload = ISaveIdentityPayload {
        identity_id: "conn_123".into(),
        username: "connected_user".into(),
        balance: "500".into(),
        revision: 1,
        ..Default::default()
    };
    let save_res = save_identity_inner(handle.clone(), "testnet".into(), payload).await.unwrap();
    assert!(save_res.success);
    let map = storage::load_identity_map(&handle, "testnet").unwrap();
    assert!(map.contains_key("conn_123"));
    assert_eq!(map.get("conn_123").unwrap().username, "connected_user");
    let del_res = delete_identity_inner(handle.clone(), "testnet".into(), Some("conn_123".into())).await.unwrap();
    assert!(del_res);
    let final_map = storage::load_identity_map(&handle, "testnet").unwrap();
    assert!(!final_map.contains_key("conn_123"));
}
