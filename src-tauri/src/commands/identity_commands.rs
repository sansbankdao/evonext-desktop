// src-tauri/src/commands/identity_commands.rs

use tauri::{AppHandle, Wry};
use crate::models::{IPrivateKeys, IdentityData};
use crate::utils::{StoreManager, network_file::get_network_file};

#[tauri::command]
pub fn load_private_keys(app_handle: AppHandle<Wry>, network: String) -> Result<Option<IPrivateKeys>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;

    match manager.load(filename, "keys") {
        Ok(data) => {
            if let Some(_keys) = &data {
                println!("Private keys loaded successfully for {}.", network);
            } else {
                println!("No private keys found for {}, returning None.", network);
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load private keys for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_private_keys(app_handle: AppHandle<Wry>, network: String, payload: IPrivateKeys) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;

    match manager.save(filename, "keys", &payload) {
        Ok(_) => {
            println!("Private keys saved successfully for {}: {:?}", network, payload);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save private keys for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_private_keys(app_handle: AppHandle<Wry>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;

    match manager.delete(filename, "keys") {
        Ok(_) => {
            println!("Private keys deleted successfully for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete private keys for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn load_identity_data(app_handle: AppHandle<Wry>, network: String) -> Result<Option<IdentityData>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;

    match manager.load(filename, "identity") {
        Ok(data) => {
            if let Some(_identity) = &data {
                println!("Identity data loaded successfully for {}.", network);
            } else {
                println!("No identity data found for {}, returning None.", network);
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load identity data for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_identity_data(app_handle: AppHandle<Wry>, network: String, payload: IdentityData) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;

    match manager.save(filename, "identity", &payload) {
        Ok(_) => {
            println!("Identity data saved successfully for {}: {:?}", network, payload);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save identity data for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_identity_data(app_handle: AppHandle<Wry>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;

    match manager.delete(filename, "identity") {
        Ok(_) => {
            println!("Identity data deleted successfully for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete identity data for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
