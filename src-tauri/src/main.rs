// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Emitter, Manager};
use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, Menu, MenuItem, SubmenuBuilder},
    tray::TrayIconBuilder,
};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let connect_i = MenuItem::with_id(app, "connect", "Connect an Identity...", true, None::<&str>)?;
            let switch_i = MenuItem::with_id(app, "switch", "Switch Identity...", true, None::<&str>)?;
            let lock_i = MenuItem::with_id(app, "lock", "Lock", true, None::<&str>)?;
            let exit_i = MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[
                &connect_i,
                &switch_i,
                &lock_i,
                &exit_i
            ])?;

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
                        "exit" => {
                            println!("exit menu item was clicked");
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            /* Initialize Identities menu. */
            let identities_menu = SubmenuBuilder::new(app, "Identity")
                // .submenu_icon(menu_image) // Optional: Add an icon to the submenu
                .text("connect", "Connect an Identity...")
                .text("register", "Register a New Identity...")
                .text("recent", "Recently Used")
                .separator()
                .text("lock", "Lock")
                .text("disconnect", "Disconnect")
                .separator()
                .text("exit", "Exit")
                .build()?;

            /* Initialize (local) settings. */
            let privacy_str = "visible";
            let network_str = "testnet";
            let i18n_str = "en";

            /* Initialize privacy menu (item). */
            let check_privacy_item = CheckMenuItemBuilder::new("Display balances")
                .id("balance")
                .checked(privacy_str == "visible")
                .build(app)?;

            /* Initialize network menu (item). */
            let check_network_item = CheckMenuItemBuilder::new("Mainnet")
                .id("testnet")
                .checked(network_str == "mainnet")
                .enabled(false)
                .build(app)?;

            /* Initialize settings menu. */
            let settings_menu = SubmenuBuilder::new(app, "Settings")
                .item(&check_privacy_item)
                .item(&check_network_item)
                .build()?;

            /* Initialize i18n menu (item). */
            let check_en_item = CheckMenuItemBuilder::new("English")
                .id("en")
                .checked(i18n_str == "en")
                .build(app)?;

            /* Initialize i18n menu (item). */
            let check_cn_item = CheckMenuItemBuilder::new("Chinese")
                .id("cn")
                .checked(i18n_str == "cn")
                .enabled(false)
                .build(app)?;

            /* Initialize i18n menu (item). */
            let check_tr_item = CheckMenuItemBuilder::new("Turkish")
                .id("tr")
                .checked(i18n_str == "tr")
                .enabled(false)
                .build(app)?;

            /* Initialize i18n menu. */
            let i18n_menu = SubmenuBuilder::new(app, "Language")
                .item(&check_en_item)
                .item(&check_cn_item)
                .item(&check_tr_item)
                .build()?;

            /* Initialize Help menu. */
            let help_menu = SubmenuBuilder::new(app, "Help")
                // .submenu_icon(menu_image) // Optional: Add an icon to the submenu
                .text("bootstrap", "Bootstrap Campaign")
                // .text("register", "Register a New Identity...")
                // .text("recent", "Recently Used")
                .separator()
                // .text("lock", "Lock")
                // .text("disconnect", "Disconnect")
                // .separator()
                .text("about", "About")
                .build()?;

            /* Configure application menu. */
            let app_menu = MenuBuilder::new(app)
                .items(&[
                    &identities_menu,
                    &settings_menu,
                    &i18n_menu,
                    &help_menu
                ]).build()?;

            /* Set application menu. */
            app.set_menu(app_menu)?;

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        /* Handle menu events. */
        .on_menu_event(|app, event| {
            let window = app.get_webview_window("main").unwrap();

            match event.id().0.as_str() {
                "open" => {
                    // Handle open action, e.g., create a new window
                }
                "about" => {
                    window.emit("navigate", "/about").unwrap();
                }
                "bootstrap" => {
                    window.emit("navigate", "/bootstrap").unwrap();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("Oops! There was an error while running EvoNext.");
}
