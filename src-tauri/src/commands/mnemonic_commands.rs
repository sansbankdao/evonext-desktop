// src-tauri/src/commands/mnemonic_commands.rs

use crate::models::{IMnemonic, IPrivateKeyStore};
use crate::utils::{network_file::get_network_file, StoreManager};
use tauri::{AppHandle, Runtime};

#[tauri::command]
pub fn load_mnemonic<R: Runtime>(
    app_handle: AppHandle<R>,
    network: String,
) -> Result<Option<IMnemonic>, String> {
    let manager = StoreManager::new(&app_handle);

    let filename = get_network_file(&network, "safu")?;

    match manager.load::<IPrivateKeyStore>(filename, "keystore") {
        Ok(Some(keystore)) => Ok(keystore.mnemonic),
        Ok(None) => Ok(None),
        Err(e) => {
            println!("Failed to load mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_mnemonic<R: Runtime>(
    app_handle: AppHandle<R>,
    network: String,
    payload: IMnemonic,
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    let filename = get_network_file(&network, "safu")?;

    // Load existing keystore to preserve keys
    let mut keystore = match manager.load::<IPrivateKeyStore>(filename, "keystore") {
        Ok(Some(store)) => store,
        _ => IPrivateKeyStore::default(),
    };

    keystore.mnemonic = Some(payload);

    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => {
            println!("Mnemonic saved successfully to keystore for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to save mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_mnemonic<R: Runtime>(app_handle: AppHandle<R>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    let filename = get_network_file(&network, "safu")?;

    let mut keystore = match manager.load::<IPrivateKeyStore>(filename, "keystore") {
        Ok(Some(store)) => store,
        Ok(None) => return Ok(()),
        Err(e) => return Err(e.to_string()),
    };

    keystore.mnemonic = None;

    match manager.save(filename, "keystore", &keystore) {
        Ok(_) => {
            println!("Mnemonic deleted successfully from keystore for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("Failed to delete mnemonic for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::{mock_builder, MockRuntime};

    #[test]
    fn test_mnemonic_lifecycle() {
        let app = mock_builder().build(tauri::generate_context!()).unwrap();
        let network = "testnet".to_string();
        let mnemonic = IMnemonic {
            seed_phrase: "apple banana cherry".to_string(),
        };

        // FIXED: Explicitly clone the handle as required by Tauri v2 App traits in tests
        let handle: AppHandle<MockRuntime> = app.handle().clone();

        // Test Save
        let save_res = save_mnemonic::<MockRuntime>(handle.clone(), network.clone(), mnemonic.clone());
        assert!(save_res.is_ok());

        // Test Load
        let load_res = load_mnemonic::<MockRuntime>(handle.clone(), network.clone()).unwrap();
        assert!(load_res.is_some());
        assert_eq!(load_res.unwrap().seed_phrase, "apple banana cherry");

        // Test Delete
        let del_res = delete_mnemonic::<MockRuntime>(handle.clone(), network.clone());
        assert!(del_res.is_ok());

        // Verify Deleted
        let final_load = load_mnemonic::<MockRuntime>(handle, network.clone()).unwrap();
        assert!(final_load.is_none());
    }

    #[test]
    fn test_mnemonic_invalid_network() {
        let app = mock_builder().build(tauri::generate_context!()).unwrap();
        let handle: AppHandle<MockRuntime> = app.handle().clone();

        let result = load_mnemonic::<MockRuntime>(handle, "invalid_network".to_string());
        assert!(result.is_err());
    }
}
