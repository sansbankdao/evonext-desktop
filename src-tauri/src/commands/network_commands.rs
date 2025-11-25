// src-tauri/src/commands/network_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::INetwork;
use crate::stores::SettingsStore;

#[tauri::command]
pub fn save_network_settings(app_handle: AppHandle<Wry>, payload: INetwork) -> Result<(), String> {
    let store = SettingsStore::new(&app_handle)?;
    store.save_network(&app_handle, payload)
}

#[tauri::command]
pub fn load_network_settings(app_handle: AppHandle<Wry>) -> Result<Option<INetwork>, String> {
    let store = SettingsStore::new(&app_handle)?;
    store.load_network(&app_handle)
}
