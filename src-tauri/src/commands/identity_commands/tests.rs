// src-tauri/src/commands/identity_commands/tests.rs

use super::*;
use serde_json::json;
use tauri::test::{mock_builder, MockRuntime};
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

#[test]
fn test_identity_mapper_malformed_keys() {
    let payload = ISaveIdentityPayload {
        public_keys: vec![IAnyValue(json!({ "garbage": true }))],
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert_eq!(result.public_keys.len(), 0);
}

#[tokio::test]
async fn test_connect_identity_lifecycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(tauri::generate_context!())
        .unwrap();
    let handle: AppHandle<MockRuntime> = app.handle();

    let payload = ISaveIdentityPayload {
        identity_id: "conn_123".into(),
        username: "connected_user".into(),
        balance: "500".into(),
        revision: 1,
        ..Default::default()
    };

    // Use _inner to accept MockRuntime handle
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
