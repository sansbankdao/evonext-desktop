// src-tauri/src/menu.rs

use tauri::{
    menu::{MenuBuilder, SubmenuBuilder, MenuId},
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
    // 1. App/General Menu
    let app_menu_item = SubmenuBuilder::new(app_handle, "App")
        .text("about", "About")
        .separator()
        .text("exit", "Exit")
        .build()?;

    // 2. Studio Menu
    let studio_menu = SubmenuBuilder::new(app_handle, "Studio")
        .text("studio", "Creator Studio")
        .text("launcher", "Token Launcher")
        .build()?;

    // 3. Identity Menu
    let identities_menu = SubmenuBuilder::new(app_handle, "Identity")
        .text("identity_home", "My Identity")
        .text("connect", "Connect an Identity...")
        .text("register", "Register a New Identity...")
        .build()?;

    // 4. Wallet / Assets Menu
    let wallet_menu = SubmenuBuilder::new(app_handle, "Wallet")
        .text("wallet", "Overview")
        .text("portfolio", "Portfolio")
        .text("asset", "Asset Explorer")
        .separator()
        .text("settings", "Settings")
        .build()?;

    // 5. Help Menu
    let help_menu = SubmenuBuilder::new(app_handle, "Help")
        .text("about", "About")
        .separator()
        .text("bootstrap", "Bootstrap")
        .build()?;

    // Build the main menu bar
    // We insert &bootstrap_item directly into the items array
    let menu = MenuBuilder::new(app_handle)
        .items(&[
            &app_menu_item,
            &studio_menu,
            &identities_menu,
            &wallet_menu,
            &help_menu,
        ])
        .build()?;

    app_handle.set_menu(menu)?;
    Ok(())
}

pub fn handle_menu_event<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    match determine_action(event.id()) {
        MenuAction::Navigate(path) => {
            let _ = app.emit("navigate", path);
        }
        MenuAction::Exit => {
            app.exit(0);
        }
        MenuAction::None => {}
    }
}

pub(crate) fn determine_action(id: &MenuId) -> MenuAction {
    let id_str = id.as_ref();
    match id_str {
        // Top-level items
        "bootstrap" => MenuAction::Navigate("/bootstrap".into()),

        // Studio
        "studio" => MenuAction::Navigate("/studio".into()),
        "launcher" => MenuAction::Navigate("/launcher".into()),

        // Identity
        "identity_home" => MenuAction::Navigate("/identity".into()),
        "connect" => MenuAction::Navigate("/connect".into()),
        "register" => MenuAction::Navigate("/identity/register".into()),

        // Wallet & Assets
        "wallet" => MenuAction::Navigate("/wallet".into()),
        "portfolio" => MenuAction::Navigate("/portfolio".into()),
        "asset" => MenuAction::Navigate("/asset".into()),

        // Settings & General
        "settings" => MenuAction::Navigate("/settings".into()),
        "about" => MenuAction::Navigate("/about".into()),
        "exit" | "quit" => MenuAction::Exit,
        _ => MenuAction::None,
    }
}
