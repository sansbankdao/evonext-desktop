use tauri::{AppHandle, Wry};
use crate::models::{IPrivateKeys, IdentityData};
use crate::constants::{SAFU_FILE, IDENTITY_FILE};
use std::path::PathBuf;
use tauri_plugin_store::StoreBuilder;

#[tauri::command]
pub fn load_private_keys(app_handle: AppHandle<Wry>) -> Result<Option<IPrivateKeys>, String> {
    let path = SAFU_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(json_value) = store.get("keys") {
        let payload: IPrivateKeys = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        println!("Private keys loaded successfully.");
        Ok(Some(payload))
    } else {
        println!("NO private keys found, returning default.");
        Ok(None)
    }
}

#[tauri::command]
pub fn save_private_keys(app_handle: AppHandle<Wry>, payload: IPrivateKeys) -> Result<(), String> {
    let path = SAFU_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("keys".to_string(), serde_json::to_value(payload).unwrap());
    store.save().map_err(|e| e.to_string())?;

    println!("Private key saved successfully.");
    Ok(())
}

#[tauri::command]
pub fn load_identity_data(app_handle: AppHandle<Wry>) -> Result<Option<IdentityData>, String> {
    let path = IDENTITY_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(json_value) = store.get("identity") {
        let payload: IdentityData = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        println!("Identity data loaded successfully.");
        Ok(Some(payload))
    } else {
        println!("NO identity data found, returning default.");
        Ok(None)
    }
}

#[tauri::command]
pub fn save_identity_data(app_handle: AppHandle<Wry>, payload: IdentityData) -> Result<(), String> {
    let path = IDENTITY_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("identity".to_string(), serde_json::to_value(payload).unwrap());
    store.save().map_err(|e| e.to_string())?;

    println!("Identity data saved successfully.");
    Ok(())
}
