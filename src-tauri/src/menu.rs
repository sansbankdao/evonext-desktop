// src-tauri/src/menu.rs

use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, SubmenuBuilder, MenuId},
    AppHandle, Emitter, Runtime,
};

#[cfg(test)]
mod tests;

#[derive(Debug, PartialEq)]
pub enum MenuAction {
    Navigate(String),
    Exit,
    None,
}

pub fn setup_menus<R: Runtime>(app_handle: &AppHandle<R>) -> tauri::Result<()> {
    let identities_menu = SubmenuBuilder::new(app_handle, "Identity")
        .text("connect", "Connect an Identity...")
        .text("register", "Register a New Identity...")
        .separator()
        .text("exit", "Exit")
        .build()?;

    let _check_privacy_item = CheckMenuItemBuilder::new("Show balances")
        .id("balance_visibility")
        .checked(true)
        .build(app_handle)?;

    let app_menu = MenuBuilder::new(app_handle)
        .items(&[&identities_menu])
        .build()?;

    app_handle.set_menu(app_menu)?;
    Ok(())
}

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    match determine_action(event.id()) {
        MenuAction::Navigate(path) => { let _ = app.emit("navigate", path); }
        MenuAction::Exit => { app.exit(0); }
        MenuAction::None => {}
    }
}

/// Extracted logic to make it testable without triggering unimplemented mock exits
pub(crate) fn determine_action(id: &MenuId) -> MenuAction {
    let id_str = id.as_ref();
    match id_str {
        "about" => MenuAction::Navigate("/about".into()),
        "asset" => MenuAction::Navigate("/asset".into()),
        "exit" | "quit" => MenuAction::Exit,
        _ => MenuAction::None,
    }
}
