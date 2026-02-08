// src-tauri/src/commands/license_commands/tests.rs

use super::*;
use crate::models::ILicense;
use tauri::test::{mock_builder, MockRuntime};

#[tokio::test]
async fn test_license_storage_lifecycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(tauri::generate_context!())
        .unwrap();
    let handle = app.handle();

    let license = ILicense {
        success: true,
        identity_id: "test_identity_id".into(),
        txid: "mock_txid".into(),
        is_premium: true,
        created_at: 1700000000,
        expires_at: 1800000000,
        updated_at: None,
    };

    // 1. Save License
    save_license(handle.clone(), license.clone()).expect("Failed to save license");

    // 2. Load License
    let loaded = load_license(handle.clone(), "test_identity_id".into())
        .await
        .expect("Failed to load license");

    assert!(loaded.is_some());
    let l = loaded.unwrap();
    assert_eq!(l.txid, "mock_txid");
    assert!(l.is_premium);

    // 3. Delete License
    delete_license(handle.clone(), "test_identity_id".into()).expect("Failed to delete license");

    let final_load = load_license(handle.clone(), "test_identity_id".into())
        .await
        .unwrap();
    assert!(final_load.is_none());
}
