// src-tauri/src/commands/license_commands.rs

use crate::constants::LICENSE_FILE;
use crate::models::{ILicense, ILicenseStoreMap};
use crate::utils::StoreManager;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Runtime;

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub async fn refresh_license(
    app_handle: tauri::AppHandle,
    identity_id: String,
) -> Result<ILicense, String> {
    refresh_license_inner(app_handle, identity_id).await
}

pub async fn refresh_license_inner<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    identity_id: String,
) -> Result<ILicense, String> {
    let url = format!("https://evonext.app/v1/stakeline/status?identityId={}", identity_id);
    let mut api_data = reqwest::get(url).await.map_err(|e| e.to_string())?.json::<ILicense>().await.map_err(|e| e.to_string())?;

    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_secs();
    api_data.updated_at = Some(now.to_string());

    save_license_inner(app_handle, api_data.clone())?;
    Ok(api_data)
}

#[tauri::command]
#[specta::specta]
pub async fn load_license(
    app_handle: tauri::AppHandle,
    identity_id: String,
) -> Result<Option<ILicense>, String> {
    load_license_inner(app_handle, identity_id).await
}

pub async fn load_license_inner<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    identity_id: String,
) -> Result<Option<ILicense>, String> {
    let manager = StoreManager::new(&app_handle);
    // RESILIENT LOAD: If the JSON is "bad" (old types), return None instead of Err
    let map: Option<ILicenseStoreMap> = manager.load(LICENSE_FILE, "licenses").unwrap_or(None);

    match map {
        Some(m) => Ok(m.get(&identity_id).cloned()),
        None => Ok(None),
    }
}

#[tauri::command]
#[specta::specta]
pub fn save_license(app_handle: tauri::AppHandle, payload: ILicense) -> Result<(), String> {
    save_license_inner(app_handle, payload)
}

pub fn save_license_inner<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    payload: ILicense,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    // RESILIENT LOAD: If the file on disk is corrupted/old, start with a new Map
    let mut map: ILicenseStoreMap = manager.load(LICENSE_FILE, "licenses").unwrap_or_default().unwrap_or_default();

    let key = payload.identity_id.clone();
    map.insert(key, payload);

    // FIXED: Removed .into() from LICENSE_FILE
    manager.save(LICENSE_FILE, "licenses", &map).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_license(app_handle: tauri::AppHandle, identity_id: String) -> Result<(), String> {
    delete_license_inner(app_handle, identity_id)
}

pub fn delete_license_inner<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    identity_id: String,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let mut map: ILicenseStoreMap = manager.load(LICENSE_FILE, "licenses").unwrap_or_default().unwrap_or_default();

    map.remove(&identity_id);

    // FIXED: Removed .into() from LICENSE_FILE
    manager.save(LICENSE_FILE, "licenses", &map).map(|_| ()).map_err(|e| e.to_string())
}
