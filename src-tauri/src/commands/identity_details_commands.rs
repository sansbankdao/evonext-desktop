// src-tauri/src/commands/identity_details_commands.rs

use crate::models::IIdentityPublicKey;
use crate::identity::storage;
use crate::utils::{StoreManager, PersistentStore};

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub fn update_identity_with_sdk_data(
    app_handle: tauri::AppHandle,
    network: String,
    identity_id: String,
    public_keys: Vec<IIdentityPublicKey>,
    revision: u32,
    public_key_ids: Vec<u32>,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    update_identity_with_sdk_data_logic(&manager, network, identity_id, public_keys, revision, public_key_ids)
}

pub fn update_identity_with_sdk_data_logic<S: PersistentStore>(
    store: &S,
    network: String,
    identity_id: String,
    public_keys: Vec<IIdentityPublicKey>,
    revision: u32,
    _public_key_ids: Vec<u32>,
) -> Result<(), String> {
    let mut identities = storage::load_identity_map_internal(store, &network)?;
    if let Some(identity_data) = identities.get_mut(&identity_id) {
        identity_data.public_keys = public_keys;
        identity_data.revision = revision;
        identity_data.is_authenticated = true;
        storage::save_identity_map_internal(store, &network, &identities, None)?;
        Ok(())
    } else {
        Err(format!("Identity {} not found in local storage.", identity_id))
    }
}
#[tauri::command]
#[specta::specta]
pub fn get_identity_public_keys(
    app_handle: tauri::AppHandle,
    network: String,
    identity_id: String,
) -> Result<Option<Vec<IIdentityPublicKey>>, String> {
    let manager = StoreManager::new(&app_handle);
    get_identity_public_keys_logic(&manager, network, identity_id)
}
pub fn get_identity_public_keys_logic<S: PersistentStore>(
    store: &S,
    network: String,
    identity_id: String,
) -> Result<Option<Vec<IIdentityPublicKey>>, String> {
    let identities = storage::load_identity_map_internal(store, &network)?;
    Ok(identities.get(&identity_id).map(|i| i.public_keys.clone()))
}
#[tauri::command]
#[specta::specta]
pub fn delete_identity_public_keys(
    app_handle: tauri::AppHandle,
    network: String,
    identity_id: String,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    delete_identity_public_keys_logic(&manager, network, identity_id)
}
pub fn delete_identity_public_keys_logic<S: PersistentStore>(
    store: &S,
    network: String,
    identity_id: String,
) -> Result<(), String> {
    let mut identities = storage::load_identity_map_internal(store, &network)?;
    if let Some(identity_data) = identities.get_mut(&identity_id) {
        identity_data.public_keys = vec![];
        storage::save_identity_map_internal(store, &network, &identities, None)?;
        Ok(())
    } else {
        Err(format!("Identity {} not found in local storage.", identity_id))
    }
}
