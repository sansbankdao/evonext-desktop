// src-tauri/src/commands/mnemonic_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::IMnemonic;
use crate::constants::SAFU_FILE;
use std::path::PathBuf;
use tauri_plugin_store::StoreBuilder;

#[tauri::command]
pub fn load_mnemonic(app_handle: AppHandle<Wry>) -> Result<Option<IMnemonic>, String> {
    let path = SAFU_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(json_value) = store.get("mnemonic") {
        let payload: IMnemonic = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        println!("Mnemonic phrase loaded successfully.");
        Ok(Some(payload))
    } else {
        println!("NO mnemonic phrase found, returning default.");
        Ok(None)
    }
}

#[tauri::command]
pub fn save_mnemonic(app_handle: AppHandle<Wry>, payload: IMnemonic) -> Result<(), String> {
    let path = SAFU_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("mnemonic".to_string(), serde_json::to_value(payload).unwrap());
    store.save().map_err(|e| e.to_string())?;

    println!("Mnemonic phrase saved successfully.");
    Ok(())
}
