// src-tauri/src/commands/identity_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::{IPrivateKeys, IdentityData};
use crate::stores::{SafuStore, IdentityStore};

#[tauri::command]
pub fn save_private_keys(app_handle: AppHandle<Wry>, payload: IPrivateKeys) -> Result<(), String> {
    let store = SafuStore::new(&app_handle)?;
    store.save_private_keys(&app_handle, payload)
}

#[tauri::command]
pub fn load_private_keys(app_handle: AppHandle<Wry>) -> Result<Option<IPrivateKeys>, String> {
    let store = SafuStore::new(&app_handle)?;
    store.load_private_keys(&app_handle)
}

#[tauri::command]
pub fn save_identity_data(app_handle: AppHandle<Wry>, payload: IdentityData) -> Result<(), String> {
    let store = IdentityStore::new(&app_handle)?;
    store.save_identity(&app_handle, payload)
}

#[tauri::command]
pub fn load_identity_data(app_handle: AppHandle<Wry>) -> Result<Option<IdentityData>, String> {
    let store = IdentityStore::new(&app_handle)?;
    store.load_identity(&app_handle)
}
