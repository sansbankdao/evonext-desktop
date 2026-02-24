// src-tauri/src/commands/settings_commands.rs

use crate::cmd_res;
use crate::models::{IAppSettings, ICommandResult};
use crate::utils::{PersistentStore, StoreManager};

#[cfg(test)]
mod tests;

const SETTINGS_FILE: &str = "settings.json";
const SETTINGS_KEY: &str = "app_settings";

#[tauri::command]
#[specta::specta]
pub fn load_settings(app_handle: tauri::AppHandle) -> ICommandResult<Option<IAppSettings>> {
    let manager = StoreManager::new(&app_handle);
    cmd_res!(load_settings_logic(&manager))
}

pub fn load_settings_logic<S: PersistentStore>(store: &S) -> Result<Option<IAppSettings>, String> {
    store
        .load_data::<IAppSettings>(SETTINGS_FILE, SETTINGS_KEY)
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn save_settings(app_handle: tauri::AppHandle, settings: IAppSettings) -> ICommandResult<()> {
    let manager = StoreManager::new(&app_handle);
    cmd_res!(save_settings_logic(&manager, settings))
}

pub fn save_settings_logic<S: PersistentStore>(
    store: &S,
    settings: IAppSettings,
) -> Result<(), String> {
    store
        .save_data(SETTINGS_FILE, SETTINGS_KEY, &settings)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_settings(app_handle: tauri::AppHandle) -> ICommandResult<()> {
    let manager = StoreManager::new(&app_handle);
    cmd_res!(delete_settings_logic(&manager))
}

pub fn delete_settings_logic<S: PersistentStore>(store: &S) -> Result<(), String> {
    store
        .delete_value(SETTINGS_FILE, SETTINGS_KEY)
        .map(|_| ())
        .map_err(|e| e.to_string())
}
