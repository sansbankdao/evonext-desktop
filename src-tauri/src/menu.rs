// src-tauri/src/menu.rs

use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, SubmenuBuilder, MenuId},
    AppHandle, Emitter, Runtime,
};

#[cfg(test)]
mod tests;

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
    handle_id(app, event.id());
}

/// Restored pub(crate) visibility for testability
pub(crate) fn handle_id<R: Runtime>(app: &AppHandle<R>, id: &MenuId) {
    let id_str = id.as_ref();
    match id_str {
        "about" => { let _ = app.emit("navigate", "/about"); }
        "asset" => { let _ = app.emit("navigate", "/asset"); }
        "exit" | "quit" => { app.exit(0); }
        _ => {}
    }
}
