// src-tauri/src/commands/mnemonic_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};

#[test]
fn test_mnemonic_lifecycle() {
    // FIXED: Register store plugin to prevent state() panic
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::default().build())
        .build(tauri::generate_context!())
        .unwrap();

    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let network = "testnet".to_string();
    let mnemonic = IMnemonic {
        seed_phrase: "apple banana cherry".to_string(),
    };

    let _ = save_mnemonic::<MockRuntime>(handle.clone(), network.clone(), mnemonic.clone());
    let load_res = load_mnemonic::<MockRuntime>(handle.clone(), network.clone()).unwrap();
    assert_eq!(load_res.unwrap().seed_phrase, "apple banana cherry");

    let _ = delete_mnemonic::<MockRuntime>(handle.clone(), network.clone());
    let final_load = load_mnemonic::<MockRuntime>(handle, network.clone()).unwrap();
    assert!(final_load.is_none());
}
