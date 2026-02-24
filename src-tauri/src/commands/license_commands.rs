// src-tauri/src/commands/license_commands.rs

use crate::cmd_res;
use crate::constants::LICENSE_FILE;
use crate::models::{ICommandResult, ILicense, ILicenseStoreMap};
use crate::utils::{PersistentStore, StoreManager};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Runtime;

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub async fn refresh_license<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    identity_id: String,
) -> ICommandResult<ILicense> {
    cmd_res!(refresh_license_inner(app_handle, identity_id).await)
}

pub async fn refresh_license_inner<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    identity_id: String,
) -> Result<ILicense, String> {
    let url = format!(
        "https://evonext.app/v1/plus/status?identityId={}",
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
        .as_secs();
    api_data.updated_at = Some(now.to_string());

    let manager = StoreManager::new(&app_handle);
    save_license_logic(&manager, api_data.clone())?;
    Ok(api_data)
}

#[tauri::command]
#[specta::specta]
pub async fn load_license<R: Runtime>(
    app_handle: tauri::AppHandle<R>,
    identity_id: String,
) -> ICommandResult<Option<ILicense>> {
    let manager = StoreManager::new(&app_handle);
    cmd_res!(load_license_logic(&manager, identity_id))
}

pub fn load_license_logic<S: PersistentStore>(
    store: &S,
    identity_id: String,
) -> Result<Option<ILicense>, String> {
    // RESILIENT LOAD: If the JSON is "bad" (old types), return None instead of Err
    let map: Option<ILicenseStoreMap> = store.load_data(LICENSE_FILE, "licenses").unwrap_or(None);

    match map {
        Some(m) => Ok(m.get(&identity_id).cloned()),
        None => Ok(None),
    }
}

#[tauri::command]
#[specta::specta]
pub fn save_license<R: Runtime>(app_handle: tauri::AppHandle<R>, payload: ILicense) -> ICommandResult<()> {
    let manager = StoreManager::new(&app_handle);
    cmd_res!(save_license_logic(&manager, payload))
}

pub fn save_license_logic<S: PersistentStore>(store: &S, payload: ILicense) -> Result<(), String> {
    let mut map: ILicenseStoreMap = store
        .load_data(LICENSE_FILE, "licenses")
        .unwrap_or_default()
        .unwrap_or_default();

    let key = payload.identity_id.clone();
    map.insert(key, payload);

    store
        .save_data(LICENSE_FILE, "licenses", &map)
        .map(|_| ())
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub fn delete_license<R: Runtime>(app_handle: tauri::AppHandle<R>, identity_id: String) -> ICommandResult<()> {
    let manager = StoreManager::new(&app_handle);
    cmd_res!(delete_license_logic(&manager, identity_id))
}

pub fn delete_license_logic<S: PersistentStore>(
    store: &S,
    identity_id: String,
) -> Result<(), String> {
    let mut map: ILicenseStoreMap = store
        .load_data(LICENSE_FILE, "licenses")
        .unwrap_or_default()
        .unwrap_or_default();
    map.remove(&identity_id);
    store
        .save_data(LICENSE_FILE, "licenses", &map)
        .map(|_| ())
        .map_err(|e| e.to_string())
}
