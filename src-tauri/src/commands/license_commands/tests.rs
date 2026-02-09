// src-tauri/src/commands/license_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};
use tauri::AppHandle;

#[tokio::test]
async fn test_license_lifecycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(tauri::generate_context!())
        .unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();

    let license = ILicense {
        success: true,
        identity_id: "test_identity_id".into(),
        txid: "test_tx_id".into(),
        is_premium: true,
        created_at: "1700000000".into(),
        expires_at: "2000000000".into(),
        updated_at: None,
    };

    // Call _inner to satisfy MockRuntime
    save_license_inner(handle.clone(), license.clone()).expect("Failed to save license");

    let loaded = load_license_inner(handle.clone(), "test_identity_id".into())
        .await
        .expect("Failed to load license");

    assert!(loaded.is_some());
    let unwrapped = loaded.unwrap();
    assert!(unwrapped.is_premium);
    assert_eq!(unwrapped.identity_id, "test_identity_id");

    delete_license_inner(handle.clone(), "test_identity_id".into()).expect("Failed to delete");

    let final_load = load_license_inner(handle.clone(), "test_identity_id".into())
        .await
        .unwrap();
    assert!(final_load.is_none());
}
