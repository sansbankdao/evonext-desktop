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

#[test]
fn test_setup_environment_idempotent() {
    // Calling setup_environment multiple times should not panic
    setup_environment();
    setup_environment();
    setup_environment();
}

#[test]
fn test_setup_environment_returns_unit() {
    let result = setup_environment();
    // Verifies the function signature returns ()
    assert_eq!(std::mem::size_of_val(&result), 0);
}
