// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{MenuBuilder, PredefinedMenuItem};

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit_i])?;

            /* Create a tray icon. */
            let tray = TrayIconBuilder::new()
                .menu(&menu)
                .menu_on_left_click(true)
                .build(app)?;

            // Create standard edit menu items
            let mut edit_menu = MenuBuilder::new(app);
            edit_menu = edit_menu
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all();

            // Add custom item
            edit_menu = edit_menu.text("custom_action", "Custom Action");

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
