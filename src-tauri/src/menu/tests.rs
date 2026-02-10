// src-tauri/src/menu/tests.rs

use super::*;
use tauri::menu::MenuId;

#[test]
fn test_handle_menu_logic_execution_pure() {
    // This test is now "Pure Rust" and safe for Windows CI
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
