// src-tauri/src/commands/settings_commands.rs

use tauri::Runtime;
use crate::models::IAppSettings;
use crate::utils::StoreManager;

#[cfg(test)]
mod tests;

const SETTINGS_FILE: &str = "settings.json";
const SETTINGS_KEY: &str = "app_settings";

#[tauri::command]
#[specta::specta]
pub fn load_settings(app_handle: tauri::AppHandle) -> Result<Option<IAppSettings>, String> {
    load_settings_inner(app_handle)
}

pub fn load_settings_inner<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<Option<IAppSettings>, String> {
    let manager = StoreManager::new(&app_handle);
    manager.load::<IAppSettings>(SETTINGS_FILE.to_string(), SETTINGS_KEY)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn save_settings(app_handle: tauri::AppHandle, settings: IAppSettings) -> Result<(), String> {
    save_settings_inner(app_handle, settings)
}

pub fn save_settings_inner<R: Runtime>(app_handle: tauri::AppHandle<R>, settings: IAppSettings) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    manager.save(SETTINGS_FILE.to_string(), SETTINGS_KEY, &settings)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_settings(app_handle: tauri::AppHandle) -> Result<(), String> {
    delete_settings_inner(app_handle)
}

pub fn delete_settings_inner<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    manager.delete(SETTINGS_FILE.to_string(), SETTINGS_KEY)
        .map(|_| ())
        .map_err(|e| e.to_string())
}
