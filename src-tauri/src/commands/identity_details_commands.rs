// src-tauri/src/commands/identity_details_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::{IdentityData, IdentityPublicKey};
use crate::utils::store::StoreManager;
use crate::constants::IDENTITY_FILE;

#[tauri::command]
pub fn update_identity_with_sdk_data(
    app_handle: AppHandle<Wry>,
    identity_id: String,
    public_keys: Vec<IdentityPublicKey>,
    revision: u64,
    public_key_ids: Vec<u32>,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    // Load existing identity data
    let existing_data: Option<IdentityData> = manager.load(IDENTITY_FILE, "identity")
        .map_err(|e| e.to_string())?;

    match existing_data {
        Some(mut identity_data) => {
            // Only update if the identity_id matches
            if identity_data.identity_id == identity_id {
                // Update with SDK data
                identity_data.public_keys = Some(public_keys);
                identity_data.revision = Some(revision);
                identity_data.public_key_ids = Some(public_key_ids);
                identity_data.created_at = Some(chrono::Utc::now().to_rfc3339());

                // Save updated identity back to store using StoreManager
                manager.save(IDENTITY_FILE, "identity", &identity_data)
                    .map_err(|e| e.to_string())?;

                println!("Identity SDK data updated successfully.");
                Ok(())
            } else {
                // Changed: Using a more descriptive error message
                Err(format!("Identity ID mismatch. Expected: {}, Got: {}", identity_data.identity_id, identity_id))
            }
        }
        None => {
            // Changed: More specific error message
            Err("No identity data found to update".to_string())
        }
    }
}

#[tauri::command]
pub fn get_identity_public_keys(app_handle: AppHandle<Wry>) -> Result<Option<Vec<IdentityPublicKey>>, String> {
    let manager = StoreManager::new(&app_handle);

    // Use StoreManager to load identity data
    match manager.load(IDENTITY_FILE, "identity") {
        Ok(Some(identity_data)) => {
            Ok(identity_data.public_keys)
        }
        Ok(None) => {
            println!("No identity data found.");
            Ok(None)
        }
        Err(e) => {
            println!("Failed to load identity data: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_identity_public_keys(app_handle: AppHandle<Wry>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    // Load existing identity data
    let existing_data: Option<IdentityData> = manager.load(IDENTITY_FILE, "identity")
        .map_err(|e| e.to_string())?;

    match existing_data {
        Some(mut identity_data) => {
            // Clear only the public keys while preserving other data
            identity_data.public_keys = None;
            identity_data.public_key_ids = None;

            // Save the updated identity data
            manager.save(IDENTITY_FILE, "identity", &identity_data)
                .map_err(|e| e.to_string())?;

            println!("Identity public keys cleared successfully.");
            Ok(())
        }
        None => {
            Err("No identity data found to clear public keys".to_string())
        }
    }
}
