// src-tauri/src/commands/mnemonic_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, mock_context, MockRuntime, noop_assets};
use tauri::AppHandle;

#[test]
fn test_mnemonic_storage_lifecycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(mock_context(noop_assets()))
        .unwrap();

    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let network = "testnet".to_string();
    let phrase = "test mnemonic phrase".to_string();

    let mnemonic_payload = IMnemonic {
        seed_phrase: phrase.clone()
    };

    let _ = save_mnemonic_inner(handle.clone(), network.clone(), mnemonic_payload.clone());

    let load_res = load_mnemonic_inner(handle.clone(), network.clone()).unwrap();

    assert_eq!(load_res, Some(mnemonic_payload));

    let _ = delete_mnemonic_inner(handle.clone(), network.clone());

    let final_load = load_mnemonic_inner(handle, network.clone()).unwrap();
    assert!(final_load.is_none());
}
