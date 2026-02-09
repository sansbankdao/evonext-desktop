// src-tauri/src/commands/settings_commands/tests.rs

use super::*;
use crate::models::{INotificationSettings, IProfileSettings};
use tauri::test::{mock_builder, MockRuntime};
use tauri::AppHandle;

fn create_mock_settings() -> IAppSettings {
    IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: Some("test-id".to_string()),
    }
}

#[test]
fn test_settings_lifecycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::default().build())
        .build(tauri::generate_context!())
        .unwrap();

    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let settings = create_mock_settings();

    // Call _inner functions to satisfy the MockRuntime type
    let _ = save_settings_inner(handle.clone(), settings.clone());

    let load_res = load_settings_inner(handle.clone()).unwrap();
    assert!(load_res.is_some());
    assert_eq!(load_res.unwrap().theme, "dark");

    let _ = delete_settings_inner(handle.clone());

    let final_load = load_settings_inner(handle).unwrap();
    assert!(final_load.is_none());
}
