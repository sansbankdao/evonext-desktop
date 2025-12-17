// src-tauri/src/commands/mnemonic_commands.rs

use tauri::{AppHandle, Wry};
use crate::models::IMnemonic;
use crate::utils::StoreManager;
use crate::constants::SAFU_FILE;

#[tauri::command]
pub fn load_mnemonic(app_handle: AppHandle<Wry>) -> Result<Option<IMnemonic>, String> {
    let manager = StoreManager::new(&app_handle);

    match manager.load(SAFU_FILE, "mnemonic") {
        Ok(data) => {
            if let Some(_mnemonic) = &data {
                println!("Mnemonic loaded successfully.");
            } else {
                println!("No mnemonic found, returning None.");
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load mnemonic: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_mnemonic(app_handle: AppHandle<Wry>, payload: IMnemonic) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.save(SAFU_FILE, "mnemonic", &payload) {
        Ok(_) => {
            println!("Mnemonic saved successfully.");
            Ok(())
        }
        Err(e) => {
            println!("Failed to save mnemonic: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_mnemonic(app_handle: AppHandle<Wry>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.delete(SAFU_FILE, "mnemonic") {
        Ok(_) => {
            println!("Mnemonic deleted successfully.");
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete mnemonic: {}", e);
            Err(e.to_string())
        }
    }
}
