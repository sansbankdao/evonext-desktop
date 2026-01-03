// src-tauri/src/commands/identity_commands.rs

use tauri::{AppHandle, Wry};
use crate::models::{PrivateKeyStore, PrivateKeyEntry, IMnemonic, IdentityData, DiscoveredIdentity, DiscoveredIdentitiesStore};
use crate::utils::{StoreManager, network_file::get_network_file};
use chrono::Utc;

#[tauri::command]
pub fn load_private_keys(app_handle: AppHandle<Wry>, network: String) -> Result<Option<PrivateKeyStore>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(data) => {
            if let Some(_store) = &data {
                println!("Private key store loaded successfully for {}.", network);
            } else {
                println!("No private key store found for {}, returning None.", network);
            }
            Ok(data)
        }
        Err(e) => {
            println!("Failed to load private key store for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_private_keys(
    app_handle: AppHandle<Wry>,
    network: String,
    identity_id: String,
    private_keys: Vec<PrivateKeyEntry>
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    // Load existing keystore (Clone filename for load)
    let mut keystore = match manager.load::<PrivateKeyStore>(filename.clone(), "keystore") {
        Ok(Some(store)) => store,
        _ => PrivateKeyStore::default(),
    };
    // Get or create entry for this identity
    let identity_keys = keystore.identities.entry(identity_id.clone())
        .or_insert_with(Vec::new);
    // Update or add keys
    for new_key in private_keys {
        // Check if we already have this key_id
        if let Some(existing_index) = identity_keys.iter().position(|k| k.key_id == new_key.key_id) {
            identity_keys[existing_index] = new_key;
        } else {
            identity_keys.push(new_key);
        }
    }
    // Save the updated keystore
    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => {
            println!("Private keys saved successfully for identity {} on {}.", identity_id, network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save private keys for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
#[tauri::command]
pub fn save_mnemonic(
    app_handle: AppHandle<Wry>,
    network: String,
    payload: IMnemonic
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    // Load existing to preserve keys
    let mut keystore = match manager.load::<PrivateKeyStore>(filename.clone(), "keystore") {
        Ok(Some(store)) => store,
        _ => PrivateKeyStore::default(),
    };
    keystore.mnemonic = Some(payload);
    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => {
            println!("Mnemonic saved successfully for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
#[tauri::command]
pub fn get_mnemonic(app_handle: AppHandle<Wry>, network: String) -> Result<Option<IMnemonic>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(Some(keystore)) => Ok(keystore.mnemonic),
        Ok(None) => Ok(None),
        Err(e) => {
            println!("Failed to load keystore for {}: {}", network, e);
            Ok(None)
        }
    }
}
#[tauri::command]
pub fn get_identity_private_keys(
    app_handle: AppHandle<Wry>,
    network: String,
    identity_id: String
) -> Result<Option<Vec<PrivateKeyEntry>>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(Some(keystore)) => {
            let keys = keystore.identities.get(&identity_id).cloned();
            Ok(keys)
        }
        Ok(None) => Ok(None),
        Err(e) => {
            println!("Failed to load keystore for {}: {}", network, e);
            Ok(None)
        }
    }
}
#[tauri::command]
pub fn delete_identity_keys(
    app_handle: AppHandle<Wry>,
    network: String,
    identity_id: String
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    let mut keystore = match manager.load::<PrivateKeyStore>(filename.clone(), "keystore") {
        Ok(Some(store)) => store,
        Ok(None) => return Ok(()), // Nothing to delete
        Err(e) => return Err(e.to_string()),
    };
    keystore.identities.remove(&identity_id);
    // If we deleted all identities, also clear mnemonic
    if keystore.identities.is_empty() {
        keystore.mnemonic = None;
    }
    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => {
            println!("Deleted keys for identity {} on {}.", identity_id, network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete keys for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
#[tauri::command]
pub fn delete_private_keys(app_handle: AppHandle<Wry>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    match manager.delete(filename, "keystore") {
        Ok(_) => {
            println!("Private key store deleted successfully for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete private keys for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
#[tauri::command]
pub fn save_single_identity_keys(
    app_handle: AppHandle<Wry>,
    network: String,
    identity_id: String,
    auth_key: String,
    transfer_key: String,
    encryption_key: String,
    seed_phrase: Option<String>
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    // Load existing keystore
    let mut keystore = match manager.load::<PrivateKeyStore>(filename.clone(), "keystore") {
        Ok(Some(store)) => store,
        _ => PrivateKeyStore::default(),
    };
    // Save mnemonic if provided
    if let Some(phrase) = seed_phrase {
        keystore.mnemonic = Some(IMnemonic { seed_phrase: phrase });
    }
    // Create key entries for the 3 standard keys
    let now = Utc::now().to_rfc3339();
    let keys = vec![
        PrivateKeyEntry {
            identity_id: identity_id.clone(),
            key_id: 0, // AUTH key ID
            purpose: 0, // AUTHENTICATION
            security_level: 0, // MASTER
            key_type: "ecdsa".to_string(),
            private_key: auth_key,
            public_key: "".to_string(), // Will be populated later
            derived_from_mnemonic: Some(true),
            created_at: now.clone(),
            last_used: now.clone(),
        },
        PrivateKeyEntry {
            identity_id: identity_id.clone(),
            key_id: 3, // TRANSFER key ID (purpose 3)
            purpose: 3, // TRANSFER
            security_level: 0, // MASTER
            key_type: "ecdsa".to_string(),
            private_key: transfer_key,
            public_key: "".to_string(),
            derived_from_mnemonic: Some(true),
            created_at: now.clone(),
            last_used: now.clone(),
        },
        PrivateKeyEntry {
            identity_id: identity_id.clone(),
            key_id: 4, // ENCRYPTION key ID (purpose 4)
            purpose: 4, // ENCRYPTION
            security_level: 0, // MASTER
            key_type: "ecdsa".to_string(),
            private_key: encryption_key,
            public_key: "".to_string(),
            derived_from_mnemonic: Some(true),
            created_at: now.clone(),
            last_used: now,
        },
    ];
    keystore.identities.insert(identity_id.clone(), keys);
    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string())
    }
}
#[tauri::command]
pub fn load_identity_data(app_handle: AppHandle<Wry>, network: String) -> Result<Option<IdentityData>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;
    match manager.load(filename, "identity") {
        Ok(data) => Ok(data),
        Err(e) => {
            println!("Failed to load identity data for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
#[tauri::command]
pub fn save_identity_data(app_handle: AppHandle<Wry>, network: String, payload: IdentityData) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;
    match manager.save(filename, "identity", &payload) {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Failed to save identity data for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
#[tauri::command]
pub fn delete_identity_data(app_handle: AppHandle<Wry>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;
    match manager.delete(filename, "identity") {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Failed to delete identity data for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
// =============================================
// NEW FUNCTIONS: DISCOVERED IDENTITIES STORAGE
// =============================================
#[tauri::command]
pub fn save_discovered_identities(
    app_handle: AppHandle<Wry>,
    network: String,
    discovered_identities: Vec<DiscoveredIdentity>,
) -> Result<usize, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "discovered")?;
    // Load existing (clone filename)
    let mut store = match manager.load::<DiscoveredIdentitiesStore>(filename.clone(), "discovered") {
        Ok(Some(existing)) => existing,
        _ => DiscoveredIdentitiesStore::default(),
    };
    // Merge/update
    for di in discovered_identities {
        store.identities.insert(di.identity_id.clone(), di);
    }
    store.last_scan = Some(Utc::now().to_rfc3339());
    // Save
    match manager.save(filename, "discovered", &store) {
        Ok(_) => {
            println!("Saved {} discovered identities for {}", store.identities.len(), network);
            Ok(store.identities.len())
        }
        Err(e) => {
            println!("Failed to save discovered identities for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
#[tauri::command]
pub fn load_discovered_identities(
    app_handle: AppHandle<Wry>,
    network: String,
) -> Result<Option<DiscoveredIdentitiesStore>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "discovered")?;
    match manager.load::<DiscoveredIdentitiesStore>(filename, "discovered") {
        Ok(Some(store)) => Ok(Some(store)),
        Ok(None) => Ok(None),
        Err(e) => {
            println!("Failed to load discovered identities for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
#[tauri::command]
pub fn clear_discovered_identities(
    app_handle: AppHandle<Wry>,
    network: String,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "discovered")?;
    match manager.delete(filename, "discovered") {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Failed to clear discovered identities for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
