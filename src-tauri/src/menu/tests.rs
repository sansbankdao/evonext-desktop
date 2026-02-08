// src-tauri/src/menu/tests.rs

use super::*;
use tauri::menu::MenuId;
use tauri::test::{mock_builder, MockRuntime};

#[test]
fn test_menu_setup_completes() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();
    let res = setup_menus(app.handle());
    assert!(res.is_ok());
}

#[test]
fn test_handle_menu_logic_execution() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();

    // Testing the routing logic directly
    handle_id(&handle, &MenuId::new("about"));
    handle_id(&handle, &MenuId::new("exit"));
    handle_id(&handle, &MenuId::new("unknown_id_123"));
}
