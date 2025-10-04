// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
};
use tauri::{
    image::Image,
    menu::{CheckMenuItemBuilder, IconMenuItemBuilder, MenuBuilder, SubmenuBuilder},
};
// use tauri::menu::{MenuBuilder};

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
                    match event.id().0.as_str() {
                        "open" => {
                            // Handle open action, e.g., create a new window
                        }
                        "quit" => {
                            println!("quit menu item was clicked");
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Create standard edit menu items
            // let mut edit_menu = MenuBuilder::new(app);
            // edit_menu = edit_menu
            //     .text("get_connected", "Connect")
            //     .text("manage_ids", "Identities")
            //     .separator()
            //     .quit();

            // // Add custom item
            // edit_menu = edit_menu.text("help", "Need help?");

            // let menu = edit_menu.build()?;

            // // Set the menu
            // app.set_menu(menu)?;

            // // Handle menu events
            // app.on_menu_event(|_app_handle, event| {
            //     match event.id().0.as_str() {
            //         "your_menu_id" => { /* handle event */ }
            //         _ => {}
            //     }
            // });

            let identities_menu = SubmenuBuilder::new(app, "Identities")
                // .submenu_icon(menu_image) // Optional: Add an icon to the submenu
                .text("new", "Create")
                .text("open", "Open")
                .text("recent", "Recent")
                .text("quit", "Quit")
                .build()?;

            let option_str = "en";
            let check_options_item_1 = CheckMenuItemBuilder::new("Show balances")
                .id("balance")
                .checked(option_str == "balance")
                .build(app)?;

            let check_options_item_2 = CheckMenuItemBuilder::new("Testnet")
                .id("testnet")
                .checked(option_str == "testnet")
                .enabled(false)
                .build(app)?;

            let options_item = SubmenuBuilder::new(app, "Options")
                .item(&check_options_item_1)
                .item(&check_options_item_2)
                .build()?;

            let lang_str = "en";
            let check_sub_item_1 = CheckMenuItemBuilder::new("English")
                .id("en")
                .checked(lang_str == "en")
                .build(app)?;

            let check_sub_item_2 = CheckMenuItemBuilder::new("Chinese")
                .id("en")
                .checked(lang_str == "en")
                .enabled(false)
                .build(app)?;

            let lang_item = SubmenuBuilder::new(app, "Language")
                .item(&check_sub_item_1)
                .item(&check_sub_item_2)
                .build()?;

            /* Configure application menu. */
            let menu = MenuBuilder::new(app)
                .items(&[&identities_menu, &options_item, &lang_item])
                .build()?;

            /* Set application menu. */
            app.set_menu(menu)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
