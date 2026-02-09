// src-tauri/src/export_types.rs

use specta_typescript::Typescript;

// Explicitly import the command modules
use evonext::commands::{
    asset_commands, crypto_commands, dapi_commands, identity_commands,
    identity_details_commands, license_commands, mnemonic_commands, settings_commands,
};

#[cfg(test)]
mod export_types_tests;

/// Separated builder logic to make it testable.
pub fn create_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            // Asset Commands
            asset_commands::discover_assets,
            asset_commands::fetch_identity_tokens,
            asset_commands::load_assets,
            asset_commands::save_assets,
            asset_commands::delete_assets,
            // Crypto Commands
            crypto_commands::hash160,
            crypto_commands::random_bytes,
            // Identity Commands
            identity_commands::save_identity,
            identity_commands::delete_identity,
            identity_commands::save_keys,
            identity_commands::load_keystore,
            // Identity Details Commands
            identity_details_commands::update_identity_with_sdk_data,
            identity_details_commands::get_identity_public_keys,
            identity_details_commands::delete_identity_public_keys,
            // License Commands
            license_commands::load_license,
            license_commands::save_license,
            license_commands::delete_license,
            license_commands::refresh_license,
            // Mnemonic Commands
            mnemonic_commands::load_mnemonic,
            mnemonic_commands::save_mnemonic,
            mnemonic_commands::delete_mnemonic,
            // Settings Commands
            settings_commands::load_settings,
            settings_commands::save_settings,
            settings_commands::delete_settings,
            // DAPI Commands
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
        ])
}
fn main() {
    let builder = create_builder();
    builder
        .export(Typescript::default(), "../src/types/rust_generated.ts")
        .expect("Failed to export typescript bindings");
    println!("✅ TypeScript bindings generated successfully.");
}
