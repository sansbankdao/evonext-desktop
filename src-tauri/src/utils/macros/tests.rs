// src-tauri/src/utils/macros/tests.rs

use serde::{Serialize, Deserialize};
use tauri::test::{mock_builder, MockRuntime};

#[derive(Serialize, Deserialize, Clone, Debug, Default, Type, PartialEq)]
pub struct MacroTestPayload {
    pub key: String,
}

// Expand the macro into testable commands
create_store_command!(
    test_load_macro,
    test_save_macro,
    test_delete_macro,
    "macro_test.json",
    "test_key",
    MacroTestPayload
);

#[tokio::test]
async fn test_macro_generated_commands_lifecycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(tauri::generate_context!())
        .unwrap();
    let handle: tauri::AppHandle<MockRuntime> = app.handle().clone();

    let payload = MacroTestPayload { key: "macro_value".into() };

    // 1. Test Generated Save
    test_save_macro(handle.clone(), payload.clone()).unwrap();

    // 2. Test Generated Load
    let loaded = test_load_macro(handle.clone()).unwrap().unwrap();
    assert_eq!(loaded, payload);

    // 3. Test Generated Delete
    test_delete_macro(handle.clone()).unwrap();
    let final_load = test_load_macro(handle.clone()).unwrap();
    assert!(final_load.is_none());
}
