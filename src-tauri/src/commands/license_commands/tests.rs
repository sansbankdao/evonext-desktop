// src-tauri/src/commands/license_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, mock_context, MockRuntime, noop_assets};
use tauri::AppHandle;

#[tokio::test]
async fn test_license_lifecycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(mock_context(noop_assets()))
        .unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();

    // Ensure we start with a clean state for this specific ID
    let _ = delete_license_inner(handle.clone(), "test_identity_id".into());

    let license = ILicense {
        success: true,
        identity_id: "test_identity_id".into(),
        txid: "test_tx_id".into(),
        is_premium: true,
        created_at: "1700000000".into(),
        expires_at: "2000000000".into(),
        updated_at: None,
    };

    save_license_inner(handle.clone(), license.clone()).expect("Failed to save license");

    let loaded = load_license_inner(handle.clone(), "test_identity_id".into())
        .await
        .expect("Failed to load license");

    assert!(loaded.is_some());
    let unwrapped = loaded.unwrap();
    assert_eq!(unwrapped.identity_id, "test_identity_id");

    let _ = delete_license_inner(handle.clone(), "test_identity_id".into());
    let final_load = load_license_inner(handle.clone(), "test_identity_id".into())
        .await
        .unwrap();
    assert!(final_load.is_none());
}
