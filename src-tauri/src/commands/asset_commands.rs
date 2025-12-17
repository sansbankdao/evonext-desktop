// src-tauri/src/commands/asset_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::IAssets;
use crate::utils::store::StoreManager;
use crate::constants::ASSETS_FILE;

#[tauri::command]
pub fn load_assets(app_handle: AppHandle<Wry>) -> Result<Option<IAssets>, String> {
    let manager = StoreManager::new(&app_handle);

    match manager.load(ASSETS_FILE, "assets") {
        Ok(data) => {
            if let Some(assets) = &data {
                println!("Assets loaded successfully: {:?}", assets);
            } else {
                println!("No assets found, returning None.");
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load assets: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_assets(app_handle: AppHandle<Wry>, payload: IAssets) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.save(ASSETS_FILE, "assets", &payload) {
        Ok(_) => {
            println!("Assets saved successfully: {:?}", payload);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save assets: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_assets(app_handle: AppHandle<Wry>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.delete(ASSETS_FILE, "assets") {
        Ok(_) => {
            println!("Assets deleted successfully.");
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete assets: {}", e);
            Err(e.to_string())
        }
    }
}
