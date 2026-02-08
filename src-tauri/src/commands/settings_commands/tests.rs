// src-tauri/src/commands/settings_commands/tests.rs

use super::*;
use crate::models::{INotificationSettings, IProfileSettings};
use tauri::test::{mock_builder, MockRuntime};

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
    // FIXED: Register store plugin to prevent state() panic
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::default().build())
        .build(tauri::generate_context!())
        .unwrap();

    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let settings = create_mock_settings();

    let _ = save_settings::<MockRuntime>(handle.clone(), settings.clone());
    let load_res = load_settings::<MockRuntime>(handle.clone()).unwrap();
    assert!(load_res.is_some());
    assert_eq!(load_res.unwrap().theme, "dark");

    let _ = delete_settings::<MockRuntime>(handle.clone());
    let final_load = load_settings::<MockRuntime>(handle).unwrap();
    assert!(final_load.is_none());
}
