// src-tauri/src/lib.rs

mod commands;
mod dapi;
mod models;
mod menu;
mod constants;
mod utils;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            commands::asset_commands::load_assets,
            commands::asset_commands::save_assets,
            commands::asset_commands::delete_assets,
            commands::identity_commands::load_private_keys,
            commands::identity_commands::save_private_keys,
            commands::identity_commands::delete_private_keys,
            commands::identity_commands::load_identity_data,
            commands::identity_commands::save_identity_data,
            commands::identity_commands::delete_identity_data,
            commands::license_commands::load_license,
            commands::license_commands::save_license,
            commands::license_commands::delete_license,
            commands::mnemonic_commands::load_mnemonic,
            commands::mnemonic_commands::save_mnemonic,
            commands::mnemonic_commands::delete_mnemonic,
            commands::settings_commands::load_settings,
            commands::settings_commands::save_settings,
            commands::settings_commands::delete_settings,
            commands::identity_details_commands::update_identity_with_sdk_data,
            commands::identity_details_commands::get_identity_public_keys,
            commands::identity_details_commands::delete_identity_public_keys,
            // Add DAPI commands
            commands::dapi_commands::dapi_request,
            commands::dapi_commands::dapi_request_array,
            commands::dapi_commands::get_posts,
            commands::dapi_commands::get_identity_info,
            commands::dapi_commands::get_identity_balance,
            commands::dapi_commands::get_token_balances,
            commands::dapi_commands::resolve_dpns_name,
            commands::dapi_commands::get_dpns_username,
            commands::dapi_commands::get_platform_status,
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
