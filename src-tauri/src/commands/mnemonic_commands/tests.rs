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

    // FIX 1: Add .clone() to get the owned AppHandle
    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let network = "testnet".to_string();
    let phrase = "test mnemonic phrase".to_string();

    // FIX 2: Use the struct IMnemonic instead of a raw String
    let mnemonic_payload = IMnemonic {
        seed_phrase: phrase.clone()
    };

    let _ = save_mnemonic_inner(handle.clone(), network.clone(), mnemonic_payload.clone());

    let load_res = load_mnemonic_inner(handle.clone(), network.clone()).unwrap();

    // FIX 3: Compare Option<IMnemonic> with Option<IMnemonic>
    assert_eq!(load_res, Some(mnemonic_payload));

    let _ = delete_mnemonic_inner(handle.clone(), network.clone());

    let final_load = load_mnemonic_inner(handle, network.clone()).unwrap();
    assert!(final_load.is_none());
}
