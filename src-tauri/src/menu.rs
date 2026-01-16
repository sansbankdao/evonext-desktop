// src-tauri/src/menu.rs

use tauri::{
    AppHandle,
    Manager,
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItem, SubmenuBuilder},
    tray::TrayIconBuilder,
    Emitter,
};

pub fn setup_menus(app_handle: &AppHandle) -> tauri::Result<()> {
    // 1. Build the App Menu
    let identities_menu = SubmenuBuilder::new(app_handle, "Identity")
        .text("connect", "Connect an Identity...")
        .text("register", "Register a New Identity...")
        .separator()
        .text("exit", "Exit")
        .build()?;

    let check_privacy_item = CheckMenuItemBuilder::new("Show balances")
        .id("balance_visibility")
        .checked(true)
        .build(app_handle)?;

    let settings_menu = SubmenuBuilder::new(app_handle, "Settings")
        .item(&check_privacy_item)
        .build()?;

    let tools_menu = SubmenuBuilder::new(app_handle, "Tools")
        .text("launcher", "Token Launcher")
        .text("asset", "Asset Manager")
        .text("portfolio", "Portfolio Manager")
        .text("studio", "Mini App Studio")
        .build()?;

    let help_menu = SubmenuBuilder::new(app_handle, "Help")
        .text("bootstrap", "Bootstrap Campaign")
        .text("about", "About")
        .build()?;

    let app_menu = MenuBuilder::new(app_handle)
        .items(&[&identities_menu, &settings_menu, &tools_menu, &help_menu])
        .build()?;

    // Set menu on the app (standard for macOS)
    app_handle.set_menu(app_menu)?;

    // 2. Build the Tray Menu
    let tray_menu = MenuBuilder::new(app_handle)
        .item(&MenuItem::with_id(app_handle, "open", "Open", true, None::<&str>)?)
        .separator()
        .item(&MenuItem::with_id(app_handle, "exit", "Exit", true, None::<&str>)?)
        .build()?;

    let icon_path = app_handle.path().resolve(
        "icons/icon.png",
        tauri::path::BaseDirectory::Resource
    )?;

    // 3. IMPORTANT: Build the Tray and don't let it drop
    // We remove "let _tray =" to let it live for the app duration
    let _ = TrayIconBuilder::new()
        .icon(tauri::image::Image::from_path(icon_path)?)
        .menu(&tray_menu)
        .icon_as_template(true) // Useful for macOS dark/light mode
        .on_menu_event(move |app, event| {
            handle_tray_event(app, event);
        })
        .build(app_handle)?;

    Ok(())
}

fn handle_tray_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "open" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "exit" => {
            app.exit(0);
        }
        _ => {}
    }
}

pub fn handle_menu_event(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let id = event.id().as_ref();

    // DEBUG: This will show you exactly what ID is being received in the terminal
    println!("Menu Event Received: {}", id);

    // Instead of looking for "main", let's find the window that is currently active
    // OR verify "main" exists.
    if let Some(_window) = app.get_webview_window("main") {
        match id {
            "about" => { let _ = app.emit("navigate", "/about"); }
            "asset" => { let _ = app.emit("navigate", "/asset"); }
            "bootstrap" => { let _ = app.emit("navigate", "/bootstrap"); }
            "launcher" => { let _ = app.emit("navigate", "/launcher"); }
            "portfolio" => { let _ = app.emit("navigate", "/portfolio"); }
            "studio" => { let _ = app.emit("navigate", "/studio"); }
            "exit" | "quit" => { app.exit(0); }
            _ => {
                println!("No match found for menu ID: {}", id);
            }
        }
    } else {
        // This will tell you if the window label "main" is actually the problem
        println!("Error: Window 'main' not found!");
        println!("Available windows: {:?}", app.webview_windows().keys());
    }
}
