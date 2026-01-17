// src-tauri/src/commands/license_commands.rs

use crate::constants::LICENSE_FILE;
use crate::models::{ILicense, LicenseStoreMap};
use crate::utils::StoreManager;
use std::time::SystemTime;
use std::time::UNIX_EPOCH;
use tauri::{AppHandle, Wry};

#[tauri::command]
pub async fn refresh_license(
    app_handle: AppHandle<Wry>,
    identity_id: String,
) -> Result<ILicense, String> {
    let url = format!(
        "https://evonext.app/v1/stakeline/status?identityId={}",
        identity_id
    );

    // 1. Fetch from API
    let mut api_data = reqwest::get(url)
        .await
        .map_err(|e| e.to_string())?
        .json::<ILicense>()
        .await
        .map_err(|e| e.to_string())?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    api_data.updated_at = Some(now);

    // 2. Load existing map or create new
    let manager = StoreManager::new(&app_handle);
    let mut map: LicenseStoreMap = manager
        .load(LICENSE_FILE, "licenses")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    // 3. Update specific entry and save
    map.insert(identity_id, api_data.clone());
    manager
        .save(LICENSE_FILE, "licenses", &map)
        .map_err(|e| e.to_string())?;

    Ok(api_data)
}

#[tauri::command]
pub async fn load_license(
    app_handle: AppHandle<Wry>,
    identity_id: String,
) -> Result<Option<ILicense>, String> {
    let manager = StoreManager::new(&app_handle);
    let map: Option<LicenseStoreMap> = manager
        .load(LICENSE_FILE, "licenses")
        .map_err(|e| e.to_string())?;

    match map {
        Some(m) => Ok(m.get(&identity_id).cloned()),
        None => Ok(None),
    }
}

#[tauri::command]
pub fn save_license(app_handle: AppHandle<Wry>, payload: ILicense) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    // 1. Load the existing map (or start fresh if file doesn't exist)
    let mut map: LicenseStoreMap = manager
        .load(LICENSE_FILE, "licenses")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    // 2. Identify the key (identity_id) and insert/update the entry
    let key = payload.identity_id.clone();
    map.insert(key, payload.clone());

    // 3. Save the entire updated map back to the store
    match manager.save(LICENSE_FILE, "licenses", &map) {
        Ok(_) => {
            println!("License for {} saved successfully.", payload.identity_id);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save license: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_license(app_handle: AppHandle<Wry>, identity_id: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let mut map: LicenseStoreMap = manager
        .load(LICENSE_FILE, "licenses")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    map.remove(&identity_id);
    manager
        .save(LICENSE_FILE, "licenses", &map)
        .map_err(|e| e.to_string())
}
