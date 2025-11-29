// src-tauri/src/commands/network_commands.rs

use tauri::{AppHandle, Wry};
use crate::models::INetwork;
use crate::constants::SETTINGS_FILE;
use std::path::PathBuf;
use tauri_plugin_store::StoreBuilder;

#[tauri::command]
pub fn load_network_settings(app_handle: AppHandle<Wry>) -> Result<Option<INetwork>, String> {
    let path = SETTINGS_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(json_value) = store.get("network") {
        let payload: INetwork = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        println!("Network settings loaded successfully.");
        Ok(Some(payload))
    } else {
        println!("NO network settings found, returning default.");
        Ok(None)
    }
}

#[tauri::command]
pub fn save_network_settings(app_handle: AppHandle<Wry>, payload: INetwork) -> Result<(), String> {
    let path = SETTINGS_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("network".to_string(), serde_json::to_value(payload).unwrap());
    store.save().map_err(|e| e.to_string())?;

    println!("Network settings saved successfully.");
    Ok(())
}
