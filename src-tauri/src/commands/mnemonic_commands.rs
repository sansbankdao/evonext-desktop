// src-tauri/src/commands/mnemonic_commands.rs

use crate::models::{IMnemonic, IPrivateKeyStore};
use crate::utils::{network_file::get_network_file, StoreManager};
use tauri::Runtime;

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub fn load_mnemonic(
    app_handle: tauri::AppHandle,
    network: String,
) -> Result<Option<IMnemonic>, String> {
    load_mnemonic_inner(app_handle, network)
}

pub fn load_mnemonic_inner<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    network: String,
) -> Result<Option<IMnemonic>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;

    match manager.load::<IPrivateKeyStore>(filename, "keystore") {
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
) -> Result<(), String> {
    save_mnemonic_inner(app_handle, network, payload)
}

pub fn save_mnemonic_inner<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    network: String,
    payload: IMnemonic,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;

    let mut keystore = match manager.load::<IPrivateKeyStore>(filename, "keystore") {
        Ok(Some(store)) => store,
        _ => IPrivateKeyStore::default(),
    };

    keystore.mnemonic = Some(payload);

    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub fn delete_mnemonic(
    app_handle: tauri::AppHandle,
    network: String,
) -> Result<(), String> {
    delete_mnemonic_inner(app_handle, network)
}

pub fn delete_mnemonic_inner<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    network: String,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;

    let mut keystore = match manager.load::<IPrivateKeyStore>(filename, "keystore") {
        Ok(Some(store)) => store,
        Ok(None) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };

    keystore.mnemonic = None;
    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
