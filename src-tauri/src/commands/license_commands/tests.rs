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
        identity_id: "test_identity_id".into(),
        is_active: true,
        tier: "pro".into(),
        expires_at: Some(2000000000),
        updated_at: None,
    };

    // Save
    save_license(handle.clone(), license.clone()).expect("Failed to save license");

    // Load
    let loaded = load_license(handle.clone(), "test_identity_id".into())
        .await
        .expect("Failed to load license");

    assert!(loaded.is_some());
    assert_eq!(loaded.unwrap().tier, "pro");

    // Delete
    delete_license(handle.clone(), "test_identity_id".into()).expect("Failed to delete");

    let final_load = load_license(handle.clone(), "test_identity_id".into())
        .await
        .unwrap();
    assert!(final_load.is_none());
}
