// src-tauri/src/export_types.rs

use specta_typescript::Typescript;
// Bring all command functions into the local scope.
// This allows the collect_commands! macro to find the hidden __specta__ markers.
use evonext::commands::{
    asset_commands::*, crypto_commands::*, dapi_commands::*, identity_commands::*,
    identity_details_commands::*, license_commands::*, mnemonic_commands::*,
    settings_commands::*,
};

#[cfg(test)]
mod export_types_tests;

/// Separated builder logic to make it testable.
/// We explicitly use tauri::Wry to satisfy the 'tauri::Runtime' type requirement.
pub fn create_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            // Asset Commands
            discover_assets,
            fetch_identity_tokens,
            load_assets,
            save_assets,
            delete_assets,
            // Crypto Commands
            hash160,
            random_bytes,
            // Identity Commands
            save_identity,
            delete_identity,
            save_keys,
            load_keystore,
            // Identity Details Commands
            update_identity_with_sdk_data,
            get_identity_public_keys,
            delete_identity_public_keys,
            // License Commands
            load_license,
            save_license,
            delete_license,
            refresh_license,
            // Mnemonic Commands
            load_mnemonic,
            save_mnemonic,
            delete_mnemonic,
            // Settings Commands
            load_settings,
            save_settings,
            delete_settings,
            // DAPI Commands
            dapi_request,
            dapi_request_array,
            get_posts,
            get_identity_info,
            get_identity_balance,
            get_identity_by_id,
            get_token_balances,
            resolve_dpns_name,
            get_dpns_username,
            get_dpns_usernames,
            get_platform_status,
            get_identities_balances,
            get_data_contract_info,
            get_token_contract_info,
            get_token_statuses,
            get_total_supply,
            get_current_epoch,
            get_total_credits_in_platform,
            get_identity_by_public_key_hash,
            get_identity_by_non_unique_public_key_hash,
        ])
}

fn main() {
    let builder = create_builder();

    // Exporting the bindings to the frontend
    // This generates the 'rust_generated.ts' file consumed by the Vue/TypeScript frontend
    builder
        .export(Typescript::default(), "../src/types/rust_generated.ts")
        .expect("Failed to export typescript bindings");

    println!("✅ TypeScript bindings generated successfully.");
}
