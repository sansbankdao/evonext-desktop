// src-tauri/src/commands/settings_commands.rs

use tauri::{AppHandle, Wry};
use crate::models::IAppSettings;
use crate::utils::StoreManager;
use crate::constants::SETTINGS_FILE;

#[tauri::command]
pub fn load_settings(app_handle: AppHandle<Wry>) -> Result<Option<IAppSettings>, String> {
    let manager = StoreManager::new(&app_handle);

    match manager.load(SETTINGS_FILE, "settings") {
        Ok(data) => {
            if let Some(settings) = &data {
                println!("Settings loaded successfully.");
            } else {
                println!("No settings found, returning None.");
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load settings: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_settings(app_handle: AppHandle<Wry>, settings: IAppSettings) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.save(SETTINGS_FILE, "settings", &settings) {
        Ok(_) => {
            println!("Settings saved successfully.");
            Ok(())
        }
        Err(e) => {
            println!("Failed to save settings: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_settings(app_handle: AppHandle<Wry>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.delete(SETTINGS_FILE, "settings") {
        Ok(_) => {
            println!("Settings deleted successfully.");
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete settings: {}", e);
            Err(e.to_string())
        }
    }
}
