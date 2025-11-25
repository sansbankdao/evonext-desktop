// src-tauri/src/lib.rs
mod commands;
mod models;
mod stores;
mod menu;
mod constants;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::load_mnemonic,
            commands::save_mnemonic,
            commands::load_network_settings,
            commands::save_network_settings,
            commands::load_private_keys,
            commands::save_private_keys,
            commands::load_identity_data,
            commands::save_identity_data,
            commands::load_settings_from_backend,
            commands::save_settings_to_backend
        ])
        .setup(|app| {
            menu::setup_menus(app)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event);
        })
        .run(tauri::generate_context!())
        .expect("Oops! There was an error while running EvoNext.")
}
