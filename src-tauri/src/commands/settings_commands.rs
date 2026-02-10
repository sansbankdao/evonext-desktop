// src-tauri/src/commands/settings_commands.rs

use tauri::Runtime;
use crate::models::IAppSettings;
use crate::utils::{StoreManager, PersistentStore};

#[cfg(test)]
mod tests;

const SETTINGS_FILE: &str = "settings.json";
const SETTINGS_KEY: &str = "app_settings";

#[tauri::command]
#[specta::specta]
pub fn load_settings(app_handle: tauri::AppHandle) -> Result<Option<IAppSettings>, String> {
    let manager = StoreManager::new(&app_handle);
    load_settings_logic(&manager)
}

pub fn load_settings_logic<S: PersistentStore>(store: &S) -> Result<Option<IAppSettings>, String> {
    store.load_data::<IAppSettings>(SETTINGS_FILE, SETTINGS_KEY)
        .map_err(|e| e.to_string())
}

pub fn load_settings_inner<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<Option<IAppSettings>, String> {
    let manager = StoreManager::new(&app_handle);
    load_settings_logic(&manager)
}

#[tauri::command]
#[specta::specta]
pub fn save_settings(app_handle: tauri::AppHandle, settings: IAppSettings) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    save_settings_logic(&manager, settings)
}

pub fn save_settings_logic<S: PersistentStore>(store: &S, settings: IAppSettings) -> Result<(), String> {
    store.save_data(SETTINGS_FILE, SETTINGS_KEY, &settings)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub fn save_settings_inner<R: Runtime>(app_handle: tauri::AppHandle<R>, settings: IAppSettings) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    save_settings_logic(&manager, settings)
}

#[tauri::command]
#[specta::specta]
pub fn delete_settings(app_handle: tauri::AppHandle) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    delete_settings_logic(&manager)
}

pub fn delete_settings_logic<S: PersistentStore>(store: &S) -> Result<(), String> {
    store.delete_value(SETTINGS_FILE, SETTINGS_KEY)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub fn delete_settings_inner<R: Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    delete_settings_logic(&manager)
}
