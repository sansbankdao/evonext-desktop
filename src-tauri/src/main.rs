// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri::menu::{MenuBuilder};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let connect_i = MenuItem::with_id(app, "connect", "Connect", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&connect_i, &quit_i])?;

            /* Create a tray icon. */
            let icon_path = app.handle().path().resolve("icons/icon.png", tauri::path::BaseDirectory::Resource)?;
            let _tray = TrayIconBuilder::new()
                .icon(tauri::image::Image::from_path(icon_path)?)
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    if event.id.as_ref() == "quit" {
                        app.exit(0);
                    }
                    match event.id().0.as_str() {
                        "open" => {
                            // Handle open action, e.g., create a new window
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Create standard edit menu items
            let mut edit_menu = MenuBuilder::new(app);
            edit_menu = edit_menu
                .text("get_connected", "Connect")
                .text("manage_ids", "Identities")
                .separator()
                .quit();

            // Add custom item
            edit_menu = edit_menu.text("help", "Need help?");

            let menu = edit_menu.build()?;

            // Set the menu
            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(|_app_handle, event| {
                match event.id().0.as_str() {
                    "your_menu_id" => { /* handle event */ }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
