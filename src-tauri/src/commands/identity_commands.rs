// src-tauri/src/commands/identity_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::{IPrivateKeys, IdentityData};
use crate::utils::store::StoreManager;
use crate::constants::{SAFU_FILE, IDENTITY_FILE};

#[tauri::command]
pub fn load_private_keys(app_handle: AppHandle<Wry>) -> Result<Option<IPrivateKeys>, String> {
    let manager = StoreManager::new(&app_handle);

    match manager.load(SAFU_FILE, "keys") {
        Ok(data) => {
            if let Some(keys) = &data {
                println!("Private keys loaded successfully.");
            } else {
                println!("No private keys found, returning None.");
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load private keys: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_private_keys(app_handle: AppHandle<Wry>, payload: IPrivateKeys) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.save(SAFU_FILE, "keys", &payload) {
        Ok(_) => {
            println!("Private keys saved successfully: {:?}", payload);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save private keys: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_private_keys(app_handle: AppHandle<Wry>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.delete(SAFU_FILE, "keys") {
        Ok(_) => {
            println!("Private keys deleted successfully.");
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete private keys: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn load_identity_data(app_handle: AppHandle<Wry>) -> Result<Option<IdentityData>, String> {
    let manager = StoreManager::new(&app_handle);

    match manager.load(IDENTITY_FILE, "identity") {
        Ok(data) => {
            if let Some(identity) = &data {
                println!("Identity data loaded successfully.");
            } else {
                println!("No identity data found, returning None.");
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load identity data: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_identity_data(app_handle: AppHandle<Wry>, payload: IdentityData) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.save(IDENTITY_FILE, "identity", &payload) {
        Ok(_) => {
            println!("Identity data saved successfully: {:?}", payload);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save identity data: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_identity_data(app_handle: AppHandle<Wry>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.delete(IDENTITY_FILE, "identity") {
        Ok(_) => {
            println!("Identity data deleted successfully.");
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete identity data: {}", e);
            Err(e.to_string())
        }
    }
}
