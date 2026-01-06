// src-tauri/src/commands/identity_commands.rs

use tauri::{AppHandle, Wry};
use crate::models::{
    PrivateKeyStore, PrivateKeyEntry, IMnemonic, IdentityData, DiscoveredIdentity,
    DiscoveredIdentitiesStore, IdentityPublicKey
};
use crate::utils::{StoreManager, network_file::get_network_file};
use chrono::Utc;

#[tauri::command]
pub fn debug_identity_payload(payload: serde_json::Value) -> Result<(), String> {
    println!("[DEBUG] Incoming identity payload JSON: {}", payload);
    Ok(())
}

#[tauri::command]
pub fn load_private_keys(app_handle: AppHandle<Wry>, network: String) -> Result<Option<PrivateKeyStore>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(data) => Ok(data),
        Err(e) => Err(e.to_string())
    }
}

#[tauri::command]
pub fn save_private_keys(
    app_handle: AppHandle<Wry>,
    network: String,
    identity_id: String,
    private_keys: Vec<PrivateKeyEntry>
) -> Result<(), String> {
    println!("[DEBUG Backend 1] save_private_keys called for ID: {}", identity_id);
    println!("[DEBUG Backend 2] Received {} keys to save", private_keys.len());

    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    println!("[DEBUG Backend 3] Target filename: {}", filename);

    let mut keystore = match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(Some(store)) => store,
        _ => PrivateKeyStore::default(),
    };

    let identity_keys = keystore.identities.entry(identity_id.clone())
        .or_insert_with(Vec::new);

    for new_key in private_keys {
        println!("[DEBUG Backend 5] Processing key_id: {}", new_key.key_id);
        if let Some(existing_index) = identity_keys.iter().position(|k| k.key_id == new_key.key_id) {
            identity_keys[existing_index] = new_key;
        } else {
            identity_keys.push(new_key);
        }
    }

    manager.save(filename, "keystore", &keystore)
        .map_err(|e| e.to_string())
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
        Ok(Some(keystore)) => Ok(keystore.identities.get(&identity_id).cloned()),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string())
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
    let mut keystore = match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(Some(store)) => store,
        Ok(None) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };
    keystore.identities.remove(&identity_id);
    if keystore.identities.is_empty() {
        keystore.mnemonic = None;
    }
    manager.save(filename, "keystore", &keystore)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_private_keys(app_handle: AppHandle<Wry>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "safu")?;
    manager.delete(filename, "keystore").map_err(|e| e.to_string())
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
    let mut keystore = match manager.load::<PrivateKeyStore>(filename, "keystore") {
        Ok(Some(store)) => store,
        _ => PrivateKeyStore::default(),
    };
    if let Some(phrase) = seed_phrase {
        keystore.mnemonic = Some(IMnemonic { seed_phrase: phrase });
    }
    let now = Utc::now().to_rfc3339();
    let keys = vec![
        PrivateKeyEntry { identity_id: identity_id.clone(), key_id: 0, purpose: 0, security_level: 0, key_type: "ecdsa".to_string(), private_key: auth_key,      public_key: "".to_string(), derived_from_mnemonic: Some(true), created_at: now.clone(), last_used: now.clone() },
        PrivateKeyEntry { identity_id: identity_id.clone(), key_id: 3, purpose: 3, security_level: 0, key_type: "ecdsa".to_string(), private_key: transfer_key, public_key: "".to_string(), derived_from_mnemonic: Some(true), created_at: now.clone(), last_used: now.clone() },
        PrivateKeyEntry { identity_id: identity_id.clone(), key_id: 4, purpose: 4, security_level: 0, key_type: "ecdsa".to_string(), private_key: encryption_key, public_key: "".to_string(), derived_from_mnemonic: Some(true), created_at: now.clone(), last_used: now.clone() },
    ];
    keystore.identities.insert(identity_id.clone(), keys);
    manager.save(filename, "keystore", &keystore).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_identity_data(app_handle: AppHandle<Wry>, network: String) -> Result<Option<IdentityData>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;
    manager.load(filename, "identity").map_err(|e| e.to_string())
}

// Tolerant save path (accepts raw JSON and converts safely)
#[tauri::command]
pub fn save_identity_data_untyped(app_handle: AppHandle<Wry>, network: String, payload: serde_json::Value) -> Result<(), String> {
    println!("[DEBUG] save_identity_data_untyped: network={}", network);
    println!("[DEBUG] raw payload={}", payload);

    let username = payload.get("username").and_then(|v| v.as_str()).unwrap_or_default().to_string();
    let identity_id = payload.get("identity_id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
    let identity_idx = payload.get("identity_idx").and_then(|v| v.as_u64()).unwrap_or(0) as u32;

    let balance = match payload.get("balance") {
        Some(v) if v.is_string() => v.as_str().map(|s| s.to_string()),
        Some(v) if v.is_u64()    => Some(v.as_u64().unwrap().to_string()),
        Some(v) if v.is_number() => Some(v.to_string()),
        _ => None,
    };

    let is_authenticated = payload.get("is_authenticated").and_then(|v| v.as_bool()).unwrap_or(false);

    let revision = match payload.get("revision") {
        Some(v) if v.is_u64()    => Some(v.as_u64().unwrap()),
        Some(v) if v.is_string() => v.as_str().and_then(|s| s.parse::<u64>().ok()),
        Some(v) if v.is_number() => v.as_u64(),
        _ => None,
    };

    let public_keys: Option<Vec<IdentityPublicKey>> = match payload.get("public_keys") {
        Some(v) => serde_json::from_value(v.clone()).ok(),
        None => None,
    };

    let created_at = payload.get("created_at").and_then(|v| v.as_str()).map(|s| s.to_string());
    let public_key_ids: Option<Vec<u32>> = match payload.get("public_key_ids") {
        Some(v) => serde_json::from_value(v.clone()).ok(),
        None => None,
    };

    let converted = IdentityData {
        username,
        identity_id,
        identity_idx,
        balance,
        is_authenticated,
        public_keys,
        revision,
        created_at,
        public_key_ids,
    };

    println!("[DEBUG] converted payload: id={} idx={} rev={:?} bal={:?}", converted.identity_id, converted.identity_idx, converted.revision, converted.balance);

    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;
    manager.save(filename, "identity", &converted).map_err(|e| e.to_string())
}

// Strict path (kept for compatibility)
#[tauri::command]
pub fn save_identity_data(app_handle: AppHandle<Wry>, network: String, payload: IdentityData) -> Result<(), String> {
    println!("[DEBUG] save_identity_data: network={}", network);
    println!("[DEBUG] identity_id={}, idx={}, balance={:?}, revision={:?}",
        payload.identity_id, payload.identity_idx, payload.balance, payload.revision
    );
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;
    manager.save(filename, "identity", &payload).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_identity_data(app_handle: AppHandle<Wry>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "identity")?;
    manager.delete(filename, "identity").map_err(|e| e.to_string())
}

// =============================================
// DISCOVERED IDENTITIES STORAGE
// =============================================

#[tauri::command]
pub fn save_discovered_identities(
    app_handle: AppHandle<Wry>,
    network: String,
    discovered_identities: Vec<DiscoveredIdentity>,
) -> Result<usize, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "discovered")?;

    let mut store = match manager.load::<DiscoveredIdentitiesStore>(filename, "discovered") {
        Ok(Some(existing)) => existing,
        _ => DiscoveredIdentitiesStore::default(),
    };

    for di in discovered_identities {
        store.identities.insert(di.identity_id.clone(), di);
    }

    store.last_scan = Some(Utc::now().to_rfc3339());
    manager.save(filename, "discovered", &store)
        .map(|_| store.identities.len())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_discovered_identities(
    app_handle: AppHandle<Wry>,
    network: String,
) -> Result<Option<DiscoveredIdentitiesStore>, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "discovered")?;
    manager.load::<DiscoveredIdentitiesStore>(filename, "discovered").map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_discovered_identities(
    app_handle: AppHandle<Wry>,
    network: String,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "discovered")?;
    manager.delete(filename, "discovered").map_err(|e| e.to_string())
}
