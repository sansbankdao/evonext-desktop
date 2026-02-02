// src-tauri/src/commands/identity_details_commands.rs

use crate::models::{IIdentityData, IIdentityPublicKey};
use crate::utils::{network_file::get_network_file, StoreManager};
use tauri::{AppHandle, Wry};

#[tauri::command]
pub fn update_identity_with_sdk_data(
    app_handle: AppHandle<Wry>,
    network: String,
    identity_id: String,
    public_keys: Vec<IIdentityPublicKey>,
    revision: u64,
    public_key_ids: Vec<u32>,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;

    let existing_data: Option<IIdentityData> = manager
        .load::<IIdentityData>(filename, "identity")
        .map_err(|e| e.to_string())?;

    match existing_data {
        Some(mut identity_data) => {
            if identity_data.identity_id == identity_id {
                // FIXED: Direct assignments (no Some() wrapper for required fields)
                identity_data.public_keys = public_keys;
                identity_data.revision = revision as u32; // Cast u64 to u32 for model

                identity_data.public_key_ids = Some(public_key_ids);
                identity_data.created_at = Some(chrono::Utc::now().to_rfc3339());

                manager
                    .save(filename, "identity", &identity_data)
                    .map_err(|e| e.to_string())?;

                println!("Identity SDK data updated successfully for {}.", network);
                Ok(())
            } else {
                Err(format!(
                    "Identity ID mismatch. Expected: {}, Got: {}",
                    identity_data.identity_id, identity_id
                ))
            }
        }
        None => Err("No identity data found to update".to_string()),
    }
}

#[tauri::command]
pub fn get_identity_public_keys(
    app_handle: AppHandle<Wry>,
    network: String,
) -> Result<Option<Vec<IIdentityPublicKey>>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;

    match manager.load::<IIdentityData>(filename, "identity") {
        // FIXED: Wrap the Vec in Some() to match the Result<Option<Vec<...>>> return type
        Ok(Some(identity_data)) => Ok(Some(identity_data.public_keys)),
        Ok(None) => {
            println!("No identity data found for {}.", network);
            Ok(None)
        }
        Err(e) => {
            println!("Failed to load identity data for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_identity_public_keys(
    app_handle: AppHandle<Wry>,
    network: String,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;

    let existing_data: Option<IIdentityData> = manager
        .load::<IIdentityData>(filename, "identity")
        .map_err(|e| e.to_string())?;

    match existing_data {
        Some(mut identity_data) => {
            // FIXED: Set to empty vector instead of None
            identity_data.public_keys = vec![];
            identity_data.public_key_ids = None;

            manager
                .save(filename, "identity", &identity_data)
                .map_err(|e| e.to_string())?;
            println!("Identity public keys cleared successfully for {}.", network);

            Ok(())
        }
        None => Err("No identity data found to clear public keys".to_string()),
    }
}
