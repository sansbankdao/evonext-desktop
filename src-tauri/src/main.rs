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
                .text("new", "New Identity...")
                .text("open", "Open Identity...")
                .text("recent", "Open Recent")
                .separator()
                .text("lock", "Lock")
                .text("disconnect", "Disconnect")
                .separator()
                .text("exit", "Exit")
                .build()?;

            let privacy_str = "show";
            let check_privacy_item = CheckMenuItemBuilder::new("Show balances")
                .id("balance")
                .checked(privacy_str == "show")
                .build(app)?;

            let network_str = "testnet";
            let check_network_item = CheckMenuItemBuilder::new("Mainnet")
                .id("testnet")
                .checked(network_str == "mainnet")
                .enabled(false)
                .build(app)?;

            let settings_menu = SubmenuBuilder::new(app, "Settings")
                .item(&check_privacy_item)
                .item(&check_network_item)
                .build()?;

            let i18n_str = "en";
            let check_en_item = CheckMenuItemBuilder::new("English")
                .id("en")
                .checked(i18n_str == "en")
                .build(app)?;

            let check_cn_item = CheckMenuItemBuilder::new("Chinese")
                .id("cn")
                .checked(i18n_str == "cn")
                .enabled(false)
                .build(app)?;

            let check_tr_item = CheckMenuItemBuilder::new("Turkish")
                .id("tr")
                .checked(i18n_str == "tr")
                .enabled(false)
                .build(app)?;

            let i18n_menu = SubmenuBuilder::new(app, "Language")
                .item(&check_en_item)
                .item(&check_cn_item)
                .item(&check_tr_item)
                .build()?;

            /* Configure application menu. */
            let app_menu = MenuBuilder::new(app)
                .items(&[
                    &identities_menu,
                    &settings_menu,
                    &i18n_menu
                ]).build()?;

            /* Set application menu. */
            app.set_menu(app_menu)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
