// src-tauri/src/menu/tests.rs

use super::*;
use tauri::menu::MenuId;
use tauri::test::{mock_builder};

#[test]
fn test_menu_setup_completes() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();
    let res = setup_menus(app.handle());
    assert!(res.is_ok());
}

#[test]
fn test_handle_menu_logic_execution() {
    // Testing the routing logic directly via determine_action
    // to avoid unimplemented 'exit' in MockRuntime
    assert_eq!(
        determine_action(&MenuId::new("about")),
        MenuAction::Navigate("/about".into())
    );

    assert_eq!(
        determine_action(&MenuId::new("exit")),
        MenuAction::Exit
    );

    assert_eq!(
        determine_action(&MenuId::new("unknown")),
        MenuAction::None
    );
}
