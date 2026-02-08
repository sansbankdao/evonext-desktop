// src-tauri/src/app_tests.rs

use super::*;
use tauri::test::mock_builder;

#[test]
fn test_app_builder_config() {
    let app = mock_builder()
        .build(tauri::generate_context!())
        .expect("Failed to build app");

    // Verify version existence as a proxy for valid config loading
    assert!(app.handle().package_info().version.to_string().len() > 0);
}
