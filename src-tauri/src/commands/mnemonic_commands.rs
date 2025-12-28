// src-tauri/src/commands/mnemonic_commands.rs

use tauri::{AppHandle, Wry};
use crate::models::IMnemonic;
use crate::utils::{StoreManager, network_file::get_network_file};

#[tauri::command]
pub fn load_mnemonic(app_handle: AppHandle<Wry>, network: String) -> Result<Option<IMnemonic>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "mnemonic")?;

    match manager.load(filename, "mnemonic") {
        Ok(data) => {
            if let Some(_mnemonic) = &data {
                println!("Mnemonic loaded successfully for {}.", network);
            } else {
                println!("No mnemonic found for {}, returning None.", network);
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_mnemonic(app_handle: AppHandle<Wry>, network: String, payload: IMnemonic) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "mnemonic")?;

    match manager.save(filename, "mnemonic", &payload) {
        Ok(_) => {
            println!("Mnemonic saved successfully for {}.", network);
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
    let filename = get_network_file(&network, "mnemonic")?;

    match manager.delete(filename, "mnemonic") {
        Ok(_) => {
            println!("Mnemonic deleted successfully for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
