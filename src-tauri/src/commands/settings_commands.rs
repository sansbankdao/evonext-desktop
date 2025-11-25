// src-tauri/src/commands/settings_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::AppSettings;
use crate::stores::SettingsStore;

#[tauri::command]
pub fn save_settings_to_backend(app_handle: AppHandle<Wry>, settings: AppSettings) -> Result<(), String> {
    let store = SettingsStore::new(&app_handle)?;
    store.save_app_settings(&app_handle, settings)
}

#[tauri::command]
pub fn load_settings_from_backend(app_handle: AppHandle<Wry>) -> Result<Option<AppSettings>, String> {
    let store = SettingsStore::new(&app_handle)?;
    store.load_app_settings(&app_handle)
}
