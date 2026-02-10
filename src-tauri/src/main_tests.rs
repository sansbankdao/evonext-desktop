// src-tauri/src/main_tests.rs

use evonext::setup_environment;

#[test]
fn test_main_env_path_pure() {
    setup_environment();
    #[cfg(target_os = "linux")]
    {
        // This is safe because it only checks env vars
        assert!(std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_ok());
    }
}
