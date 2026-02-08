// src-tauri/src/commands/identity_details_commands.rs

use crate::models::IIdentityPublicKey;
use crate::identity::storage;
use tauri::{AppHandle, Wry};

#[tauri::command]
pub fn update_identity_with_sdk_data(
    app_handle: AppHandle<Wry>,
    network: String,
    identity_id: String,
    public_keys: Vec<IIdentityPublicKey>,
    revision: u64,
    public_key_ids: Vec<u32>,
) -> Result<(), String> {
    let mut identities = storage::load_identity_map(&app_handle, &network)?;

    if let Some(identity_data) = identities.get_mut(&identity_id) {
        identity_data.public_keys = public_keys;
        identity_data.revision = revision as u32;
        identity_data.public_key_ids = Some(public_key_ids);
        identity_data.created_at = Some(chrono::Utc::now().to_rfc3339());

        storage::save_identity_map(&app_handle, &network, &identities, None)?;
        Ok(())
    } else {
        Err(format!("Identity {} not found in local storage.", identity_id))
    }
}

#[tauri::command]
pub fn get_identity_public_keys(
    app_handle: AppHandle<Wry>,
    network: String,
    identity_id: String,
) -> Result<Option<Vec<IIdentityPublicKey>>, String> {
    let identities = storage::load_identity_map(&app_handle, &network)?;
    Ok(identities.get(&identity_id).map(|i| i.public_keys.clone()))
}

#[tauri::command]
pub fn delete_identity_public_keys(
    app_handle: AppHandle<Wry>,
    network: String,
    identity_id: String,
) -> Result<(), String> {
    let mut identities = storage::load_identity_map(&app_handle, &network)?;

    if let Some(identity_data) = identities.get_mut(&identity_id) {
        identity_data.public_keys = vec![];
        identity_data.public_key_ids = None;
        storage::save_identity_map(&app_handle, &network, &identities, None)?;
        Ok(())
    } else {
        Err(format!("Identity {} not found in local storage.", identity_id))
    }
}
