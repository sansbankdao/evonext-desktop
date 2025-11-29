// src-tauri/src/lib.rs

mod commands;
mod models;
mod menu;
mod constants;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::asset_commands::load_assets,
            commands::asset_commands::save_assets,
            commands::identity_commands::load_private_keys,
            commands::identity_commands::save_private_keys,
            commands::identity_commands::load_identity_data,
            commands::identity_commands::save_identity_data,
            commands::license_commands::load_license,
            commands::license_commands::save_license,
            commands::mnemonic_commands::load_mnemonic,
            commands::mnemonic_commands::save_mnemonic,
            commands::settings_commands::load_settings_from_backend,
            commands::settings_commands::save_settings_to_backend,
            commands::identity_details_commands::update_identity_with_sdk_data,
            commands::identity_details_commands::get_identity_public_keys,
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
