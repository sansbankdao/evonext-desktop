// src-tauri/src/commands/license_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::ILicense;
use crate::constants::LICENSE_FILE;
use std::path::PathBuf;
use tauri_plugin_store::StoreBuilder;

#[tauri::command]
pub fn load_license(app_handle: AppHandle<Wry>) -> Result<Option<ILicense>, String> {
    let path = LICENSE_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(json_value) = store.get("license") {
        let payload: ILicense = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        println!("License loaded successfully.");
        Ok(Some(payload))
    } else {
        println!("NO license phrase found, returning default.");
        Ok(None)
    }
}

#[tauri::command]
pub fn save_license(app_handle: AppHandle<Wry>, payload: ILicense) -> Result<(), String> {
    let path = LICENSE_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("license".to_string(), serde_json::to_value(payload).unwrap());
    store.save().map_err(|e| e.to_string())?;

    println!("License saved successfully.");
    Ok(())
}
