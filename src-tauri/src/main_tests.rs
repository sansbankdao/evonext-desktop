// src-tauri/src/main_tests.rs

use tauri::test::mock_builder;

#[test]
fn test_main_binary_initialization() {
    let app = mock_builder()
        .build(tauri::generate_context!())
        .expect("Failed to build app");
    // Verify version existence as a proxy for valid config loading
    assert!(app.handle().package_info().version.to_string().len() > 0);
}

#[test]
fn test_main_env_path() {
    // Tests that the library function is accessible from the binary target
    evonext::setup_environment();
    #[cfg(target_os = "linux")]
    {
        assert_eq!(std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").unwrap(), "1");
    }
}
