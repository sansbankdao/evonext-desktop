// NOTE: Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/* Import the necessary modules from the Tauri crate. */
use tauri::{
    image::Icon,
    tray::{CustomMenuItem, SystemTray, SystemTrayEvent, SystemTrayMenu},
    Manager,
};

fn main() {
    /* Initialize menu items. */
    let hide = CustomMenuItem::new("hide".to_string(), "Hide");
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");

    /* Create system tray menu. */
    let tray_menu = SystemTrayMenu::new()
        .add_item(hide)
        .add_item(quit);

    // --- 3. Create the system tray ---
    let system_tray = SystemTray::new()
        .with_menu(tray_menu)
        // Note: We are using the Icon from the `tauri::image` module here
        .with_icon(Icon::Raw(include_bytes!("../icons/icon.png").to_vec()))
        .with_icon_as_template(true);

    /* Build and run application. */
    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::MenuItemClick { id, .. } => {
                match id.as_str() {
                    "quit" => {
                        std::process::exit(0);
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                           let _ = window.hide();
                        }
                    }
                    _ => {}
                }
            }
            SystemTrayEvent::LeftClick { .. } => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("Oh no! There was an error while running EvoNext");

    // evonext_desktop_lib::run()
}
