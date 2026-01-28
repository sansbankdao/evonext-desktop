// src-tauri/src/commands/mnemonic_commands.rs

use crate::models::{IMnemonic, PrivateKeyStore};
use crate::utils::{network_file::get_network_file, StoreManager};
use tauri::{AppHandle, Wry};

#[tauri::command]
pub fn load_mnemonic(
    app_handle: AppHandle<Wry>,
    network: String,
) -> Result<Option<IMnemonic>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;

    match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(Some(keystore)) => Ok(keystore.mnemonic),
        Ok(None) => Ok(None),
        Err(e) => {
            println!("Failed to load mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_mnemonic(
    app_handle: AppHandle<Wry>,
    network: String,
    payload: IMnemonic,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;

    // Load existing keystore to preserve keys
    let mut keystore = match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(Some(store)) => store,
        _ => PrivateKeyStore::default(),
    };

    keystore.mnemonic = Some(payload);

    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => {
            println!("Mnemonic saved successfully to keystore for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_mnemonic(app_handle: AppHandle<Wry>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;

    let mut keystore = match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(Some(store)) => store,
        Ok(None) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };

    keystore.mnemonic = None;

    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => {
            println!(
                "Mnemonic deleted successfully from keystore for {}.",
                network
            );
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
