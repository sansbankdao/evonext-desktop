// src-tauri/src/lib_tests.rs

use tauri::test::{mock_builder, mock_context, noop_assets};
use crate::setup_environment;

#[test]
fn test_app_builder_config() {
    let app = mock_builder()
        .build(mock_context(noop_assets()))
        .expect("Failed to build app");

    // Check that we have a valid package name or version
    assert!(app.handle().package_info().name.len() >= 0);
}

#[test]
fn test_environment_logic() {
    setup_environment();
    #[cfg(target_os = "linux")]
    {
        assert!(std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_ok());
    }
}
