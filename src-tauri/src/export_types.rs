// src-tauri/src/export_types.rs

use specta_typescript::Typescript;
use tauri_specta::{collect_commands, Builder};

// Import models to register them explicitly
use evonext::commands::{
    asset_commands, crypto_commands, dapi_commands, identity_commands, identity_details_commands,
    license_commands, mnemonic_commands, settings_commands,
};
use evonext::models::{IAppSettings, IDiscoveredIdentity, IIdentityData, ILicense};

// Import new response types for Specta registration
use evonext::commands::identity_commands::IActiveIdentityResponse;

fn main() {
    let commands = collect_commands![
        asset_commands::discover_assets::<tauri::Wry>,
        asset_commands::fetch_identity_tokens::<tauri::Wry>,
        asset_commands::load_assets::<tauri::Wry>,
        asset_commands::save_assets::<tauri::Wry>,
        asset_commands::delete_assets::<tauri::Wry>,
        crypto_commands::hash160::<tauri::Wry>,
        crypto_commands::random_bytes::<tauri::Wry>,
        identity_commands::save_identity::<tauri::Wry>,
        identity_commands::save_identity_with_keys::<tauri::Wry>,
        identity_commands::discover_and_save_identity::<tauri::Wry>,
        identity_commands::delete_identity::<tauri::Wry>,
        identity_commands::save_keys::<tauri::Wry>,
        identity_commands::load_keystore::<tauri::Wry>,
        identity_commands::load_active_identity::<tauri::Wry>,
        identity_commands::load_identities_map::<tauri::Wry>,
        license_commands::load_license::<tauri::Wry>,
        license_commands::save_license::<tauri::Wry>,
        license_commands::delete_license::<tauri::Wry>,
        license_commands::refresh_license::<tauri::Wry>,
        mnemonic_commands::load_mnemonic::<tauri::Wry>,
        mnemonic_commands::save_mnemonic::<tauri::Wry>,
        mnemonic_commands::delete_mnemonic::<tauri::Wry>,
        settings_commands::load_settings::<tauri::Wry>,
        settings_commands::save_settings::<tauri::Wry>,
        settings_commands::delete_settings::<tauri::Wry>,
        identity_details_commands::update_identity_with_sdk_data::<tauri::Wry>,
        identity_details_commands::get_identity_public_keys::<tauri::Wry>,
        identity_details_commands::delete_identity_public_keys::<tauri::Wry>,
        dapi_commands::dapi_request,
        dapi_commands::dapi_request_array,
        dapi_commands::get_posts,
        dapi_commands::get_identity_info,
        dapi_commands::get_identity_balance,
        dapi_commands::get_identity_by_id,
        dapi_commands::get_token_balances,
        dapi_commands::resolve_dpns_name,
        dapi_commands::get_dpns_username,
        dapi_commands::get_dpns_usernames,
        dapi_commands::get_platform_status,
        dapi_commands::get_identities_balances,
        dapi_commands::get_data_contract_info,
        dapi_commands::get_token_contract_info,
        dapi_commands::get_token_statuses,
        dapi_commands::get_total_supply,
        dapi_commands::get_current_epoch,
        dapi_commands::get_total_credits_in_platform,
        dapi_commands::get_identity_by_public_key_hash,
        dapi_commands::get_identity_by_non_unique_public_key_hash,
    ];

    let builder = Builder::<tauri::Wry>::new()
        .commands(commands)
        // Ensure hidden models are exported
        .typ::<IIdentityData>()
        .typ::<IAppSettings>()
        .typ::<ILicense>()
        .typ::<IDiscoveredIdentity>()
        .typ::<IActiveIdentityResponse>();

    builder
        .export(Typescript::default(), "../src/bindings.ts")
        .expect("Failed to export typescript bindings");

    println!("✅ TypeScript bindings generated successfully in ../src/bindings.ts");
}
