// src-tauri/src/menu/tests.rs

use super::*;
use tauri::menu::MenuId;
use tauri::test::{mock_builder, mock_context, noop_assets};

#[test]
// On macOS, muda (menu library) panics if menu items are created
// outside of the main thread, which happens during unit tests.
#[cfg(not(target_os = "macos"))]
fn test_menu_setup_completes() {
    let app = mock_builder()
        .build(mock_context(noop_assets()))
        .unwrap();
    let res = setup_menus(app.handle());
    assert!(res.is_ok());
}

#[test]
fn test_handle_menu_logic_execution() {
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
