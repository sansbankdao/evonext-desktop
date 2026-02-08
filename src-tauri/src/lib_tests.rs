// src-tauri/src/lib_tests.rs

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
fn test_environment_logic() {
    setup_environment();
    #[cfg(target_os = "linux")]
    {
        assert!(std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_ok());
    }
}
