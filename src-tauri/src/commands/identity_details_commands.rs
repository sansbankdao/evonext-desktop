// src-tauri/src/commands/identity_details_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::{IdentityData, IdentityPublicKey};
use crate::constants::IDENTITY_FILE;
use std::path::PathBuf;
use tauri_plugin_store::StoreBuilder;
#[tauri::command]
pub fn update_identity_with_sdk_data(
    app_handle: AppHandle<Wry>,
    identity_id: String,
    public_keys: Vec<IdentityPublicKey>,
    revision: u64,
    public_key_ids: Vec<u32>,
) -> Result<(), String> {
    let path = IDENTITY_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;
    // Load existing identity data
    if let Some(json_value) = store.get("identity") {
        let mut identity_data: IdentityData = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        // Only update if the identity_id matches
        if identity_data.identity_id == identity_id {
            // Update with SDK data
            identity_data.public_keys = Some(public_keys);
            identity_data.revision = Some(revision);
            identity_data.public_key_ids = Some(public_key_ids);
            identity_data.created_at = Some(chrono::Utc::now().to_rfc3339());
            // Save updated identity back to store
            store.set("identity".to_string(), serde_json::to_value(identity_data).unwrap());
            store.save().map_err(|e| e.to_string())?;
            println!("Identity SDK data updated successfully.");
            Ok(())
        } else {
            Err("Identity ID mismatch".to_string())
        }
    } else {
        Err("No identity data found to update".to_string())
    }
}
#[tauri::command]
pub fn get_identity_public_keys(app_handle: AppHandle<Wry>) -> Result<Option<Vec<IdentityPublicKey>>, String> {
    let path = IDENTITY_FILE.parse::<PathBuf>().unwrap();
    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;
    if let Some(json_value) = store.get("identity") {
        let identity_data: IdentityData = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        Ok(identity_data.public_keys)
    } else {
        Ok(None)
    }
}
