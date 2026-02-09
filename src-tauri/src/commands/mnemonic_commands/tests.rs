// src-tauri/src/commands/mnemonic_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};
use tauri::AppHandle;

#[test]
fn test_mnemonic_storage_lifecycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(tauri::generate_context!())
        .unwrap();
    let handle: AppHandle<MockRuntime> = app.handle();
    let network = "testnet".to_string();
    let mnemonic = "test mnemonic phrase".to_string();

    // Call the _inner functions to satisfy the MockRuntime type
    let _ = save_mnemonic_inner(handle.clone(), network.clone(), mnemonic.clone());

    let load_res = load_mnemonic_inner(handle.clone(), network.clone()).unwrap();
    assert_eq!(load_res, Some(mnemonic));

    let _ = delete_mnemonic_inner(handle.clone(), network.clone());

    let final_load = load_mnemonic_inner(handle, network.clone()).unwrap();
    assert!(final_load.is_none());
}
