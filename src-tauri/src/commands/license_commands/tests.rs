// src-tauri/src/commands/license_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};

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
        created_at: 1700000000,
        expires_at: 2000000000,
        updated_at: None,
    };

    // Save
    save_license(handle.clone(), license.clone()).expect("Failed to save license");

    // Load
    let loaded = load_license(handle.clone(), "test_identity_id".into())
        .await
        .expect("Failed to load license");

    assert!(loaded.is_some());
    let unwrapped = loaded.unwrap();
    assert!(unwrapped.is_premium);
    assert_eq!(unwrapped.identity_id, "test_identity_id");

    // Delete
    delete_license(handle.clone(), "test_identity_id".into()).expect("Failed to delete");

    let final_load = load_license(handle.clone(), "test_identity_id".into())
        .await
        .unwrap();
    assert!(final_load.is_none());
}
