// src-tauri/src/commands/asset_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::{IAssets};
use crate::constants::{ASSETS_FILE};
use std::path::PathBuf;
use tauri_plugin_store::StoreBuilder;

#[tauri::command]
pub fn load_assets(app_handle: AppHandle<Wry>) -> Result<Option<IAssets>, String> {
    let path = ASSETS_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(json_value) = store.get("assets") {
        let payload: IAssets = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        println!("Private keys loaded successfully.");
        Ok(Some(payload))
    } else {
        println!("NO private keys found, returning default.");
        Ok(None)
    }
}

#[tauri::command]
pub fn save_assets(app_handle: AppHandle<Wry>, payload: IAssets) -> Result<(), String> {
    let path = ASSETS_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("assets".to_string(), serde_json::to_value(payload).unwrap());
    store.save().map_err(|e| e.to_string())?;

    println!("Private key saved successfully.");
    Ok(())
}
