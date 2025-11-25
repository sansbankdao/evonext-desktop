// src-tauri/src/lib.rs
mod commands;
mod models;
mod menu;
mod constants;

use commands::mnemonic_commands;
use commands::network_commands;
use commands::identity_commands;
use commands::settings_commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            mnemonic_commands::load_mnemonic,
            mnemonic_commands::save_mnemonic,
            network_commands::load_network_settings,
            network_commands::save_network_settings,
            identity_commands::load_private_keys,
            identity_commands::save_private_keys,
            identity_commands::load_identity_data,
            identity_commands::save_identity_data,
            settings_commands::load_settings_from_backend,
            settings_commands::save_settings_to_backend
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
