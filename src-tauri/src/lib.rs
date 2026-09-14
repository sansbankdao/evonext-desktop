// src-tauri/src/lib.rs

use tauri::Manager;
pub mod commands;
pub mod constants;
pub mod dapi;
pub mod history;
pub mod identity;
pub mod menu;
pub mod models;
pub mod social;
pub mod utils;
pub mod vault;

#[cfg(test)]
mod lib_tests;

#[cfg(test)]
mod integration_tests;

// ---------------------------------------------------------------------
// TEST ISOLATION (process-wide, runs before any test)
// Tests drive the real storage layer through tauri::test::mock_app,
// whose path resolver points at the REAL app data dir
// (~/.local/share/app.evonext). Without this redirect, `cargo test`
// OVERWRITES the user's live identity/settings/vault files with test
// fixtures (observed 2026-09-11: ".identity-testnet.json" replaced by
// the "wrap_id" fixture from integration_tests.rs). Redirect
// XDG_DATA_HOME for the whole test process BEFORE any test resolves a
// path. The TempDir is leaked on purpose: it must outlive every test
// thread. Linux-only path semantics; tests run on Linux hosts.
// ---------------------------------------------------------------------
#[cfg(test)]
#[ctor::ctor]
fn __isolate_test_data_dir() {
    let dir = tempfile::tempdir().expect("create isolated test data dir");
    std::env::set_var("XDG_DATA_HOME", dir.path());
    std::mem::forget(dir);
}

pub fn setup_environment() {
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("TOUCH_LEAN_MODE", "0");
    }
}

pub fn run() {
    create_app().run(|_app_handle, _event| {});
}

pub fn create_app() -> tauri::App {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::asset_commands::discover_assets,
            commands::asset_commands::fetch_identity_tokens,
            commands::asset_commands::load_assets,
            commands::asset_commands::save_assets,
            commands::asset_commands::delete_assets,
            commands::crypto_commands::hash160,
            commands::crypto_commands::random_bytes,
            commands::identity_commands::discover_and_save_identity,
            commands::identity_commands::save_identity,
            commands::identity_commands::save_identity_with_keys,
            commands::identity_commands::delete_identity,
            commands::identity_commands::save_keys,
            commands::identity_commands::load_keystore,
            commands::identity_commands::load_active_identity,
            commands::identity_commands::load_identities_map,
            commands::license_commands::load_license,
            commands::license_commands::save_license,
            commands::license_commands::delete_license,
            commands::license_commands::refresh_license,
            commands::mnemonic_commands::load_mnemonic,
            commands::mnemonic_commands::save_mnemonic,
            commands::mnemonic_commands::delete_mnemonic,
            commands::settings_commands::load_settings,
            commands::settings_commands::save_settings,
            commands::settings_commands::delete_settings,
            commands::studio_commands::ask_vibe_terminal,
            commands::identity_details_commands::update_identity_with_sdk_data,
            commands::identity_details_commands::get_identity_public_keys,
            commands::identity_details_commands::delete_identity_public_keys,
            commands::dapi_commands::dapi_request,
            commands::dapi_commands::dapi_request_array,
            commands::dapi_commands::get_posts,
            commands::dapi_commands::get_identity_info,
            commands::dapi_commands::get_identity_balance,
            commands::dapi_commands::get_identity_by_id,
            commands::dapi_commands::get_token_balances,
            commands::dapi_commands::resolve_dpns_name,
            commands::dapi_commands::get_dpns_username,
            commands::dapi_commands::get_dpns_usernames,
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
            commands::history_commands::history_list_transactions,
            commands::history_commands::history_upsert_transaction,
            commands::history_commands::history_count_transactions,
            commands::history_commands::history_clear_network,
            commands::social_commands::fetch_social_feed,
            commands::social_commands::fetch_social_feed_prefetched,
        ])
        .setup(|app| {
            let handle = app.handle();
            history::init_history_state(handle);
            vault::init_vault_state(handle);
            commands::social_commands::init_social_state(handle);
            menu::setup_menus(handle)?;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_menu(app.menu().unwrap());
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::handle_menu_event(app, event);
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
}
