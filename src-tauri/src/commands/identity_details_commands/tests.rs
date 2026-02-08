// src-tauri/src/commands/identity_details_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};

#[test]
fn test_identity_details_missing_identity() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();

    let res = update_identity_with_sdk_data(
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
