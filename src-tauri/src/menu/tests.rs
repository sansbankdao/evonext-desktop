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

    assert_eq!(determine_action(&MenuId::new("exit")), MenuAction::Exit);

    assert_eq!(determine_action(&MenuId::new("unknown")), MenuAction::None);
}

// ==================== Navigation Menu Items Tests ====================

#[test]
fn test_menu_bootstrap() {
    assert_eq!(
        determine_action(&MenuId::new("bootstrap")),
        MenuAction::Navigate("/bootstrap".into())
    );
}

#[test]
fn test_menu_studio() {
    assert_eq!(
        determine_action(&MenuId::new("studio")),
        MenuAction::Navigate("/studio".into())
    );
}

#[test]
fn test_menu_launcher() {
    assert_eq!(
        determine_action(&MenuId::new("launcher")),
        MenuAction::Navigate("/launcher".into())
    );
}

#[test]
fn test_menu_identity_home() {
    assert_eq!(
        determine_action(&MenuId::new("identity_home")),
        MenuAction::Navigate("/identity".into())
    );
}

#[test]
fn test_menu_connect() {
    assert_eq!(
        determine_action(&MenuId::new("connect")),
        MenuAction::Navigate("/connect".into())
    );
}

#[test]
fn test_menu_register() {
    assert_eq!(
        determine_action(&MenuId::new("register")),
        MenuAction::Navigate("/identity/register".into())
    );
}

#[test]
fn test_menu_wallet() {
    assert_eq!(
        determine_action(&MenuId::new("wallet")),
        MenuAction::Navigate("/wallet".into())
    );
}

#[test]
fn test_menu_portfolio() {
    assert_eq!(
        determine_action(&MenuId::new("portfolio")),
        MenuAction::Navigate("/portfolio".into())
    );
}

#[test]
fn test_menu_asset() {
    assert_eq!(
        determine_action(&MenuId::new("asset")),
        MenuAction::Navigate("/asset".into())
    );
}

#[test]
fn test_menu_settings() {
    assert_eq!(
        determine_action(&MenuId::new("settings")),
        MenuAction::Navigate("/settings".into())
    );
}

#[test]
fn test_menu_plus() {
    assert_eq!(
        determine_action(&MenuId::new("plus")),
        MenuAction::Navigate("/plus".into())
    );
}

// ==================== Exit Menu Items Tests ====================

#[test]
fn test_menu_exit() {
    assert_eq!(determine_action(&MenuId::new("exit")), MenuAction::Exit);
}

#[test]
fn test_menu_quit() {
    assert_eq!(determine_action(&MenuId::new("quit")), MenuAction::Exit);
}

// ==================== Unknown Menu Items Tests ====================

#[test]
fn test_menu_unknown_empty() {
    assert_eq!(determine_action(&MenuId::new("")), MenuAction::None);
}

#[test]
fn test_menu_unknown_random() {
    assert_eq!(
        determine_action(&MenuId::new("random_item")),
        MenuAction::None
    );
}

#[test]
fn test_menu_unknown_case_sensitive() {
    // Menu IDs are case-sensitive
    assert_eq!(determine_action(&MenuId::new("About")), MenuAction::None);
    assert_eq!(determine_action(&MenuId::new("EXIT")), MenuAction::None);
}

// ==================== MenuAction Tests ====================

#[test]
fn test_menu_action_equality() {
    let action1 = MenuAction::Navigate("/test".into());
    let action2 = MenuAction::Navigate("/test".into());
    let action3 = MenuAction::Navigate("/other".into());
    let action4 = MenuAction::Exit;
    let action5 = MenuAction::None;

    assert_eq!(action1, action2);
    assert_ne!(action1, action3);
    assert_ne!(action1, action4);
    assert_ne!(action1, action5);
}

#[test]
fn test_menu_action_debug() {
    let navigate = MenuAction::Navigate("/test".into());
    let exit = MenuAction::Exit;
    let none = MenuAction::None;

    let debug_navigate = format!("{:?}", navigate);
    let debug_exit = format!("{:?}", exit);
    let debug_none = format!("{:?}", none);

    assert!(debug_navigate.contains("Navigate"));
    assert!(debug_exit.contains("Exit"));
    assert!(debug_none.contains("None"));
}

#[test]
fn test_menu_action_clone() {
    let action = MenuAction::Navigate("/test".into());
    let cloned = action.clone();
    assert_eq!(action, cloned);
}

// ==================== Edge Cases Tests ====================

#[test]
fn test_menu_special_characters_in_id() {
    assert_eq!(
        determine_action(&MenuId::new("test-item")),
        MenuAction::None
    );
}

#[test]
fn test_menu_numeric_id() {
    assert_eq!(determine_action(&MenuId::new("123")), MenuAction::None);
}

#[test]
fn test_menu_long_id() {
    let long_id = "a".repeat(100);
    assert_eq!(determine_action(&MenuId::new(&long_id)), MenuAction::None);
}

#[test]
fn test_menu_paths_are_correct() {
    // Verify all navigation paths are correct
    let test_cases = vec![
        ("bootstrap", "/bootstrap"),
        ("studio", "/studio"),
        ("launcher", "/launcher"),
        ("identity_home", "/identity"),
        ("connect", "/connect"),
        ("register", "/identity/register"),
        ("wallet", "/wallet"),
        ("portfolio", "/portfolio"),
        ("asset", "/asset"),
        ("settings", "/settings"),
        ("about", "/about"),
        ("plus", "/plus"),
    ];

    for (id, expected_path) in test_cases {
        match determine_action(&MenuId::new(id)) {
            MenuAction::Navigate(path) => assert_eq!(path, expected_path, "Failed for id: {}", id),
            _ => panic!("Expected Navigate action for id: {}", id),
        }
    }
}
