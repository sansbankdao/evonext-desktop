// src-tauri/src/commands/identity_details_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};
use tauri::AppHandle;

#[test]
fn test_identity_details_missing_identity() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(tauri::generate_context!())
        .unwrap();

    let handle: AppHandle<MockRuntime> = app.handle().clone();

    // Call the _inner function to satisfy MockRuntime handle
    let res = update_identity_with_sdk_data_inner(
        handle,
        "testnet".into(),
        "non_existent".into(),
        vec![],
        1,
        vec![]
    );

    assert!(res.is_err());
    assert!(res.unwrap_err().contains("not found"));
}
