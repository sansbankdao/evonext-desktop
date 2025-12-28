// src-tauri/src/commands/asset_commands.rs

use tauri::{AppHandle, Wry};
use crate::models::IAssets;
use crate::utils::{StoreManager, network_file::get_network_file};

#[tauri::command]
pub fn load_assets(app_handle: AppHandle<Wry>, network: String) -> Result<Option<IAssets>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    match manager.load(filename, "assets") {
        Ok(data) => {
            if let Some(assets) = &data {
                println!("Assets loaded successfully for {}: {:?}", network, assets);
            } else {
                println!("No assets found for {}, returning None.", network);
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load assets for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_assets(app_handle: AppHandle<Wry>, network: String, payload: IAssets) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    match manager.save(filename, "assets", &payload) {
        Ok(_) => {
            println!("Assets saved successfully for {}: {:?}", network, payload);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save assets for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_assets(app_handle: AppHandle<Wry>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    match manager.delete(filename, "assets") {
        Ok(_) => {
            println!("Assets deleted successfully for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete assets for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
