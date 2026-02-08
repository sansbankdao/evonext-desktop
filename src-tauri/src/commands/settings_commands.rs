// src-tauri/src/commands/settings_commands.rs

use crate::constants::SETTINGS_FILE;
use crate::models::IAppSettings;
use crate::utils::StoreManager;
use tauri::{AppHandle, Runtime};

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub fn load_settings<R: Runtime>(app_handle: AppHandle<R>) -> Result<Option<IAppSettings>, String> {
    let manager = StoreManager::new(&app_handle);

    match manager.load(SETTINGS_FILE, "settings") {
        Ok(data) => Ok(data),
        Err(e) => {
            println!("Failed to load settings: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn save_settings<R: Runtime>(app_handle: AppHandle<R>, settings: IAppSettings) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.save(SETTINGS_FILE, "settings", &settings) {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Failed to save settings: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
#[specta::specta]
pub fn delete_settings<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.delete(SETTINGS_FILE, "settings") {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Failed to delete settings: {}", e);
            Err(e.to_string())
        }
    }
}
