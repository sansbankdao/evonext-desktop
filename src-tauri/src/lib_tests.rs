// src-tauri/src/lib_tests.rs

use crate::setup_environment;

#[test]
fn test_environment_logic_pure() {
    setup_environment();
    #[cfg(target_os = "linux")]
    {
        assert!(std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_ok());
    }
}
