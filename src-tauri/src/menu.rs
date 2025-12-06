// src-tauri/src/menu.rs
use tauri::{
    App,
    AppHandle,
    Manager, // WHY DO WE NEED THIS??
    Wry,
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItem, SubmenuBuilder},
    tray::TrayIconBuilder,
    Emitter, // WHY DO WE NEED THIS??
};

pub fn setup_menus(app: &App) -> tauri::Result<()> {
    let app_handle = app.handle();

    /* Initialize application menus */
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

    let help_menu = SubmenuBuilder::new(app_handle, "Help")
        .text("bootstrap", "Bootstrap Campaign")
        .text("studio", "Mini App Studio")
        .text("about", "About")
        .build()?;

    let app_menu = MenuBuilder::new(app_handle)
        .items(&[&identities_menu, &settings_menu, &help_menu])
        .build()?;

    app_handle.set_menu(app_menu)?;

    /* Create the tray icon and its menu */
    let tray_menu = MenuBuilder::new(app_handle)
        .item(&MenuItem::with_id(app_handle, "open", "Open", true, None::<&str>)?)
        .separator()
        .item(&MenuItem::with_id(app_handle, "exit", "Exit", true, None::<&str>)?)
        .build()?;

    let icon_path = app_handle.path().resolve("icons/icon.png", tauri::path::BaseDirectory::Resource)?;

    let _tray = TrayIconBuilder::new()
        .icon(tauri::image::Image::from_path(icon_path)?)
        .menu(&tray_menu)
        .on_menu_event(move |app, event| {
            handle_tray_event(app, event);
        })
        .build(app_handle)?;

    Ok(())
}

fn handle_tray_event(app: &AppHandle<Wry>, event: tauri::menu::MenuEvent) {
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

pub fn handle_menu_event(app: &AppHandle<Wry>, event: tauri::menu::MenuEvent) {
    if let Some(window) = app.get_webview_window("main") {
        match event.id().as_ref() {
            "about" => {
                window.emit("navigate", "/about").unwrap();
            }
            "bootstrap" => {
                window.emit("navigate", "/bootstrap").unwrap();
            }
            "studio" => {
                window.emit("navigate", "/studio").unwrap();
            }
            _ => {}
        }
    }
}
