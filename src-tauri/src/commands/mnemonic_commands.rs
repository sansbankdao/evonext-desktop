// src-tauri/src/commands/mnemonic_commands.rs

use crate::cmd_res;
use crate::models::{ICommandResult, IMnemonic, IPrivateKeyStore};
use crate::utils::{network_file::get_network_file, PersistentStore, StoreManager};

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub fn load_mnemonic(
    app_handle: tauri::AppHandle,
    network: String,
) -> ICommandResult<Option<IMnemonic>> {
    let manager = StoreManager::new(&app_handle);
    cmd_res!(load_mnemonic_logic(&manager, network))
}

pub fn load_mnemonic_logic<S: PersistentStore>(
    store: &S,
    network: String,
) -> Result<Option<IMnemonic>, String> {
    let filename = get_network_file(&network, "safu")?;
    match store.load_data::<IPrivateKeyStore>(&filename, "keystore") {
        Ok(Some(keystore)) => Ok(keystore.mnemonic),
        Ok(None) => Ok(None),
        Err(e) => {
            println!("Failed to load mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn save_mnemonic(
    app_handle: tauri::AppHandle,
    network: String,
    payload: IMnemonic,
) -> ICommandResult<()> {
    let manager = StoreManager::new(&app_handle);
    cmd_res!(save_mnemonic_logic(&manager, network, payload))
}

pub fn save_mnemonic_logic<S: PersistentStore>(
    store: &S,
    network: String,
    payload: IMnemonic,
) -> Result<(), String> {
    let filename = get_network_file(&network, "safu")?;
    let mut keystore = match store.load_data::<IPrivateKeyStore>(&filename, "keystore") {
        Ok(Some(store)) => store,
        _ => IPrivateKeyStore::default(),
    };
    keystore.mnemonic = Some(payload);
    store
        .save_data(&filename, "keystore", &keystore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_mnemonic(app_handle: tauri::AppHandle, network: String) -> ICommandResult<()> {
    let manager = StoreManager::new(&app_handle);
    cmd_res!(delete_mnemonic_logic(&manager, network))
}

pub fn delete_mnemonic_logic<S: PersistentStore>(store: &S, network: String) -> Result<(), String> {
    let filename = get_network_file(&network, "safu")?;
    let mut keystore = match store.load_data::<IPrivateKeyStore>(&filename, "keystore") {
        Ok(Some(store)) => store,
        Ok(None) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };
    keystore.mnemonic = None;
    store
        .save_data(&filename, "keystore", &keystore)
        .map_err(|e| e.to_string())
}
