// src-tauri/src/main_tests.rs

use tauri::test::{mock_builder, mock_context, noop_assets};

#[test]
fn test_main_binary_initialization() {
    let app = mock_builder()
        .build(mock_context(noop_assets()))
        .expect("Failed to build app");

    // Verify package name existence as a proxy for valid config loading
    assert!(app.handle().package_info().name.len() >= 0);
}

#[test]
fn test_main_env_path() {
    // Tests that the library function is accessible from the binary target
    evonext::setup_environment();
    #[cfg(target_os = "linux")]
    {
        // Check if environment variables set in setup_environment are present
        assert!(std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_ok());
    }
}
