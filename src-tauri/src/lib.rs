// src-tauri/src/lib.rs

mod commands;
mod dapi;
mod models;
mod menu;
mod constants;
mod utils;
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // Assets
            commands::asset_commands::load_assets,
            commands::asset_commands::save_assets,
            commands::asset_commands::delete_assets,
            // Identity Keys
            commands::identity_commands::load_private_keys,
            commands::identity_commands::save_private_keys,
            commands::identity_commands::delete_private_keys,
            commands::identity_commands::save_single_identity_keys,
            // Identity data (legacy + tolerant)
            commands::identity_commands::load_identity_data,
            commands::identity_commands::save_identity_data_untyped,
            commands::identity_commands::save_identity_data,
            commands::identity_commands::delete_identity_data,
            commands::identity_commands::debug_identity_payload,
            // Unified Identity (Phase 1 add; not used by UI yet)
            commands::identity_v2::save_identity_unified,
            commands::identity_v2::query_and_update_identity,
            // License
            commands::license_commands::load_license,
            commands::license_commands::save_license,
            commands::license_commands::delete_license,
            // Mnemonic
            commands::mnemonic_commands::load_mnemonic,
            commands::mnemonic_commands::save_mnemonic,
            commands::mnemonic_commands::delete_mnemonic,
            // Settings
            commands::settings_commands::load_settings,
            commands::settings_commands::save_settings,
            commands::settings_commands::delete_settings,
            // Identity Details
            commands::identity_details_commands::update_identity_with_sdk_data,
            commands::identity_details_commands::get_identity_public_keys,
            commands::identity_details_commands::delete_identity_public_keys,
            // DAPI Commands
            commands::dapi_commands::dapi_request,
            commands::dapi_commands::dapi_request_array,
            commands::dapi_commands::get_posts,
            commands::dapi_commands::get_identity_info,
            commands::dapi_commands::get_identity_balance,
            commands::dapi_commands::get_identity_by_id,
            commands::dapi_commands::get_token_balances,
            commands::dapi_commands::resolve_dpns_name,
            commands::dapi_commands::get_dpns_username,
            commands::dapi_commands::get_platform_status,
            commands::dapi_commands::get_identities_balances,
            commands::dapi_commands::get_data_contract_info,
            commands::dapi_commands::get_token_contract_info,
            commands::dapi_commands::get_token_statuses,
            commands::dapi_commands::get_total_supply,
            commands::dapi_commands::get_current_epoch,
            commands::dapi_commands::get_total_credits_in_platform,
            commands::dapi_commands::get_identity_by_public_key_hash,
            commands::dapi_commands::get_identity_by_non_unique_public_key_hash,
        ])
        .setup(|app| {
            menu::setup_menus(app)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event);
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, _event| {});
}
