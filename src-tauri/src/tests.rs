// src-tauri/src/tests.rs

use tauri::test::mock_builder;
use super::setup_environment;

#[test]
fn test_app_builder_config() {
    let app = mock_builder()
        .build(tauri::generate_context!())
        .expect("Failed to build app");

    // Verify version existence as a proxy for valid config loading
    assert!(app.handle().package_info().version.to_string().len() > 0);
}

#[test]
fn test_environment_initialization_path() {
    // This executes the logic inside main.rs to ensure it doesn't panic
    // and correctly sets variables on supported platforms.
    setup_environment();

    #[cfg(target_os = "linux")]
    {
        assert_eq!(std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").unwrap(), "1");
        assert_eq!(std::env::var("TOUCH_LEAN_MODE").unwrap(), "0");
    }
}
