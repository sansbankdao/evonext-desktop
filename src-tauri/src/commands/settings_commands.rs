// src-tauri/src/commands/settings_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::IAppSettings;
use crate::constants::SETTINGS_FILE;
use std::path::PathBuf;
use tauri_plugin_store::StoreBuilder;

#[tauri::command]
pub fn load_settings(app_handle: AppHandle<Wry>) -> Result<Option<IAppSettings>, String> {
    let path = SETTINGS_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(json_value) = store.get("settings") {
        let settings: IAppSettings = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        println!("Settings loaded successfully.");
        Ok(Some(settings))
    } else {
        println!("NO Application settings found, returning default.");
        Ok(None)
    }
}

#[tauri::command]
pub fn save_settings(app_handle: AppHandle<Wry>, settings: IAppSettings) -> Result<(), String> {
    let path = SETTINGS_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("settings".to_string(), serde_json::to_value(settings).unwrap());
    store.save().map_err(|e| e.to_string())?;

    println!("Application Settings saved successfully.");
    Ok(())
}
