// src-tauri/src/commands/license_commands.rs

use std::time::SystemTime;
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Wry};
use crate::models::ILicense;
use crate::utils::StoreManager;
use crate::constants::LICENSE_FILE;

#[tauri::command]
pub async fn refresh_license(
    app_handle: AppHandle<Wry>,
    identity_id: String
) -> Result<ILicense, String> {
    let url = format!(
        "https://evonext.app/v1/stakeline/status?identityId={}",
        identity_id
    );
    println!("Request license file: {}", url);

    // Perform API Request
    let mut response = reqwest::get(url)
        .await
        .map_err(|e| format!("Network error: {}", e))?
        .json::<ILicense>()
        .await
        .map_err(|e| format!("Parsing error: {}", e))?;
    // Add local timestamp
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs() as i64;
    response.updated_at = Some(now);
    // Save to file using existing StoreManager
    let manager = StoreManager::new(&app_handle);
    manager.save(LICENSE_FILE, "license", &response)
        .map_err(|e| e.to_string())?;
    Ok(response)
}

#[tauri::command]
pub fn load_license(app_handle: AppHandle<Wry>) -> Result<Option<ILicense>, String> {
    let manager = StoreManager::new(&app_handle);

    match manager.load(LICENSE_FILE, "license") {
        Ok(data) => {
            if let Some(_license) = &data {
                println!("License loaded successfully.");
            } else {
                println!("No license found, returning None.");
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load license: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_license(app_handle: AppHandle<Wry>, payload: ILicense) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.save(LICENSE_FILE, "license", &payload) {
        Ok(_) => {
            println!("License saved successfully: {:?}", payload);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save license: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_license(app_handle: AppHandle<Wry>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.delete(LICENSE_FILE, "license") {
        Ok(_) => {
            println!("License deleted successfully.");
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete license: {}", e);
            Err(e.to_string())
        }
    }
}
