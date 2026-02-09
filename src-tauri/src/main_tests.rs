// src-tauri/src/main_tests.rs

use tauri::test::{mock_builder, mock_context, noop_assets};

#[test]
fn test_main_binary_initialization() {
    let app = mock_builder()
        .build(mock_context(noop_assets()))
        .expect("Failed to build app");

    // Fixed warning: use is_empty instead of len >= 0
    assert!(!app.handle().package_info().name.is_empty());
}

#[test]
fn test_main_env_path() {
    evonext::setup_environment();
    #[cfg(target_os = "linux")]
    {
        assert!(std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_ok());
    }
}
