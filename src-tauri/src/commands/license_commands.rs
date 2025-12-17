// src-tauri/src/commands/license_commands.rs

use tauri::{AppHandle, Wry};
use crate::models::ILicense;
use crate::utils::StoreManager;
use crate::constants::LICENSE_FILE;

#[tauri::command]
pub fn load_license(app_handle: AppHandle<Wry>) -> Result<Option<ILicense>, String> {
    let manager = StoreManager::new(&app_handle);

    match manager.load(LICENSE_FILE, "license") {
        Ok(data) => {
            if let Some(_license) = &data {
                println!("License loaded successfully.");
            } else {
                println!("No license found, returning None.");
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load license: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_license(app_handle: AppHandle<Wry>, payload: ILicense) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.save(LICENSE_FILE, "license", &payload) {
        Ok(_) => {
            println!("License saved successfully: {:?}", payload);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save license: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_license(app_handle: AppHandle<Wry>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.delete(LICENSE_FILE, "license") {
        Ok(_) => {
            println!("License deleted successfully.");
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete license: {}", e);
            Err(e.to_string())
        }
    }
}
