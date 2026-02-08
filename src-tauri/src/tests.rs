// src-tauri/src/tests.rs

use tauri::test::mock_builder;
use crate::setup_environment;

#[test]
fn test_app_builder_config() {
    let app = mock_builder()
        .build(tauri::generate_context!())
        .expect("Failed to build app");
    assert!(app.handle().package_info().version.to_string().len() > 0);
}

#[test]
fn test_environment_initialization_path() {
    setup_environment();
    #[cfg(target_os = "linux")]
    {
        assert_eq!(std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").unwrap(), "1");
        assert_eq!(std::env::var("TOUCH_LEAN_MODE").unwrap(), "0");
    }
}
