// src-tauri/src/stores.rs
use std::path::PathBuf;
use tauri::{AppHandle, Wry};
use tauri_plugin_store::{StoreBuilder};
use crate::models::{IMnemonic, IPrivateKeys, INetwork, IdentityData, AppSettings};
use crate::constants;

pub struct SafuStore {}

impl SafuStore {
    pub fn new(app_handle: &AppHandle<Wry>) -> Result<Self, String> {
        let path = constants::SAFU_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        store.save().map_err(|e| e.to_string())?;
        Ok(Self {})
    }

    pub fn save_mnemonic(&self, app_handle: &AppHandle<Wry>, payload: IMnemonic) -> Result<(), String> {
        let path = constants::SAFU_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        store.set("mnemonic".to_string(), serde_json::to_value(payload).unwrap());
        store.save().map_err(|e| e.to_string())?;

        println!("Mnemonic phrase saved successfully.");
        Ok(())
    }

    pub fn load_mnemonic(&self, app_handle: &AppHandle<Wry>) -> Result<Option<IMnemonic>, String> {
        let path = constants::SAFU_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        if let Some(json_value) = store.get("mnemonic") {
            let payload: IMnemonic = serde_json::from_value(json_value.clone())
                .map_err(|e| e.to_string())?;
            println!("Mnemonic phrase loaded successfully.");
            Ok(Some(payload))
        } else {
            println!("NO mnemonic phrase found, returning default.");
            Ok(None)
        }
    }

    pub fn save_private_keys(&self, app_handle: &AppHandle<Wry>, payload: IPrivateKeys) -> Result<(), String> {
        let path = constants::SAFU_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        store.set("keys".to_string(), serde_json::to_value(payload).unwrap());
        store.save().map_err(|e| e.to_string())?;

        println!("Private key saved successfully.");
        Ok(())
    }

    pub fn load_private_keys(&self, app_handle: &AppHandle<Wry>) -> Result<Option<IPrivateKeys>, String> {
        let path = constants::SAFU_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        if let Some(json_value) = store.get("keys") {
            let payload: IPrivateKeys = serde_json::from_value(json_value.clone())
                .map_err(|e| e.to_string())?;
            println!("Private keys loaded successfully.");
            Ok(Some(payload))
        } else {
            println!("NO private keys found, returning default.");
            Ok(None)
        }
    }
}

pub struct SettingsStore {}

impl SettingsStore {
    pub fn new(app_handle: &AppHandle<Wry>) -> Result<Self, String> {
        let path = constants::SETTINGS_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        store.save().map_err(|e| e.to_string())?;
        Ok(Self {})
    }

    pub fn save_network(&self, app_handle: &AppHandle<Wry>, payload: INetwork) -> Result<(), String> {
        let path = constants::SETTINGS_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        store.set("network".to_string(), serde_json::to_value(payload).unwrap());
        store.save().map_err(|e| e.to_string())?;

        println!("Network settings saved successfully.");
        Ok(())
    }

    pub fn load_network(&self, app_handle: &AppHandle<Wry>) -> Result<Option<INetwork>, String> {
        let path = constants::SETTINGS_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        if let Some(json_value) = store.get("network") {
            let payload: INetwork = serde_json::from_value(json_value.clone())
                .map_err(|e| e.to_string())?;
            println!("Network settings loaded successfully.");
            Ok(Some(payload))
        } else {
            println!("NO network settings found, returning default.");
            Ok(None)
        }
    }

    pub fn save_app_settings(&self, app_handle: &AppHandle<Wry>, settings: AppSettings) -> Result<(), String> {
        let path = constants::SETTINGS_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        store.set("settings".to_string(), serde_json::to_value(settings).unwrap());
        store.save().map_err(|e| e.to_string())?;

        println!("Application Settings saved successfully.");
        Ok(())
    }

    pub fn load_app_settings(&self, app_handle: &AppHandle<Wry>) -> Result<Option<AppSettings>, String> {
        let path = constants::SETTINGS_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        if let Some(json_value) = store.get("settings") {
            let settings: AppSettings = serde_json::from_value(json_value.clone())
                .map_err(|e| e.to_string())?;
            println!("Settings loaded successfully.");
            Ok(Some(settings))
        } else {
            println!("NO Application settings found, returning default.");
            Ok(None)
        }
    }
}

pub struct IdentityStore {}

impl IdentityStore {
    pub fn new(app_handle: &AppHandle<Wry>) -> Result<Self, String> {
        let path = constants::IDENTITY_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        store.save().map_err(|e| e.to_string())?;
        Ok(Self {})
    }

    pub fn save_identity(&self, app_handle: &AppHandle<Wry>, payload: IdentityData) -> Result<(), String> {
        let path = constants::IDENTITY_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        store.set("identity".to_string(), serde_json::to_value(payload).unwrap());
        store.save().map_err(|e| e.to_string())?;

        println!("Identity data saved successfully.");
        Ok(())
    }

    pub fn load_identity(&self, app_handle: &AppHandle<Wry>) -> Result<Option<IdentityData>, String> {
        let path = constants::IDENTITY_FILE.parse::<PathBuf>().unwrap();
        let store = StoreBuilder::new(app_handle, path)
            .build()
            .map_err(|e| e.to_string())?;

        if let Some(json_value) = store.get("identity") {
            let payload: IdentityData = serde_json::from_value(json_value.clone())
                .map_err(|e| e.to_string())?;
            println!("Identity data loaded successfully.");
            Ok(Some(payload))
        } else {
            println!("NO identity data found, returning default.");
            Ok(None)
        }
    }
}
