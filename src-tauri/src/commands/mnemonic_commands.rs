// src-tauri/src/commands/mnemonic_commands.rs

use crate::models::{IMnemonic, IPrivateKeyStore};
use crate::utils::{network_file::get_network_file, StoreManager};
use tauri::{AppHandle, Runtime, Manager};

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
            println!(
                "Mnemonic deleted successfully from keystore for {}.",
                network
            );
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
    use tauri::test::mock_builder;

    #[test]
    fn test_mnemonic_lifecycle() {
        let app = mock_builder().build(tauri::generate_context!()).unwrap();
        let network = "testnet".to_string();
        let mnemonic = IMnemonic {
            seed_phrase: "apple banana cherry".to_string(),
        };

        // Test Save - Pass handle directly (it is an owned AppHandle<MockRuntime>)
        let save_res = save_mnemonic(app.handle(), network.clone(), mnemonic.clone());
        assert!(save_res.is_ok());

        // Test Load
        let load_res = load_mnemonic(app.handle(), network.clone()).unwrap();
        assert!(load_res.is_some());
        assert_eq!(load_res.unwrap().seed_phrase, "apple banana cherry");

        // Test Delete
        let del_res = delete_mnemonic(app.handle(), network.clone());
        assert!(del_res.is_ok());

        // Verify Deleted
        let final_load = load_mnemonic(app.handle(), network.clone()).unwrap();
        assert!(final_load.is_none());
    }

    #[test]
    fn test_mnemonic_invalid_network() {
        let app = mock_builder().build(tauri::generate_context!()).unwrap();

        // Use app.handle() directly in the argument to satisfy AppHandle<R> (owned)
        let result = load_mnemonic(app.handle(), "invalid_network".to_string());
        assert!(result.is_err());
    }
}
