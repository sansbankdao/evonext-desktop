// src-tauri/src/commands/mnemonic_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::IMnemonic;
use crate::stores::SafuStore;

#[tauri::command]
pub fn save_mnemonic(app_handle: AppHandle<Wry>, payload: IMnemonic) -> Result<(), String> {
    let store = SafuStore::new(&app_handle)?;
    store.save_mnemonic(&app_handle, payload)
}

#[tauri::command]
pub fn load_mnemonic(app_handle: AppHandle<Wry>) -> Result<Option<IMnemonic>, String> {
    let store = SafuStore::new(&app_handle)?;
    store.load_mnemonic(&app_handle)
}
