// src-tauri/src/commands/license_commands.rs

use crate::constants::LICENSE_FILE;
use crate::models::{ILicense, ILicenseStoreMap};
use crate::utils::StoreManager;
use std::time::{SystemTime, UNIX_EPOCH};

#[cfg(test)]
#[path = "license_commands/tests.rs"]
mod tests;

#[tauri::command]
#[specta::specta]
pub async fn refresh_license(
    app_handle: tauri::AppHandle,
    identity_id: String,
) -> Result<ILicense, String> {
    let url = format!(
        "https://evonext.app/v1/stakeline/status?identityId={}",
        identity_id
    );

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

    let manager = StoreManager::new(&app_handle);
    let mut map: ILicenseStoreMap = manager
        .load(LICENSE_FILE, "licenses")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    map.insert(identity_id, api_data.clone());
    manager
        .save(LICENSE_FILE, "licenses", &map)
        .map_err(|e| e.to_string())?;

    Ok(api_data)
}

#[tauri::command]
#[specta::specta]
pub async fn load_license(
    app_handle: tauri::AppHandle,
    identity_id: String,
) -> Result<Option<ILicense>, String> {
    let manager = StoreManager::new(&app_handle);
    let map: Option<ILicenseStoreMap> = manager
        .load(LICENSE_FILE, "licenses")
        .map_err(|e| e.to_string())?;

    match map {
        Some(m) => Ok(m.get(&identity_id).cloned()),
        None => Ok(None),
    }
}

#[tauri::command]
#[specta::specta]
pub fn save_license(
    app_handle: tauri::AppHandle,
    payload: ILicense,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let mut map: ILicenseStoreMap = manager
        .load(LICENSE_FILE, "licenses")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    let key = payload.identity_id.clone();
    map.insert(key, payload.clone());

    manager.save(LICENSE_FILE, "licenses", &map).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_license(
    app_handle: tauri::AppHandle,
    identity_id: String,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let mut map: ILicenseStoreMap = manager
        .load(LICENSE_FILE, "licenses")
        .map_err(|e| e.to_string())?
        .unwrap_or_default();

    map.remove(&identity_id);
    manager.save(LICENSE_FILE, "licenses", &map).map(|_| ()).map_err(|e| e.to_string())
}
