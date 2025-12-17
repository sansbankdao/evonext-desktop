// src-tauri/src/utils/store.rs

use tauri::AppHandle;
use tauri_plugin_store::StoreBuilder;
use serde::{Serialize, de::DeserializeOwned};
use std::path::PathBuf;
use std::fmt;

#[derive(Debug)]
pub enum StoreError {
    Io(std::io::Error),
    Json(serde_json::Error),
    Store(String),
}

impl fmt::Display for StoreError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StoreError::Io(e) => write!(f, "IO error: {}", e),
            StoreError::Json(e) => write!(f, "JSON error: {}", e),
            StoreError::Store(e) => write!(f, "Store error: {}", e),
        }
    }
}

impl std::error::Error for StoreError {}

impl From<std::io::Error> for StoreError {
    fn from(error: std::io::Error) -> Self {
        StoreError::Io(error)
    }
}

impl From<serde_json::Error> for StoreError {
    fn from(error: serde_json::Error) -> Self {
        StoreError::Json(error)
    }
}

pub struct StoreManager<'a> {
    app_handle: &'a AppHandle<tauri::Wry>,
    file_path: PathBuf,
}

impl<'a> StoreManager<'a> {
    pub fn new(app_handle: &'a AppHandle<tauri::Wry>, file_path: impl AsRef<str>) -> Result<Self, StoreError> {
        let path = file_path.as_ref().parse::<PathBuf>()
            .map_err(|e| StoreError::Store(format!("Invalid path: {}", e)))?;

        Ok(Self {
            app_handle,
            file_path: path,
        })
    }

    pub fn load<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, StoreError> {
        let store = StoreBuilder::new(self.app_handle, self.file_path.clone())
            .build()
            .map_err(|e| StoreError::Store(e.to_string()))?;

        match store.get(key) {
            Some(value) => {
                let data: T = serde_json::from_value(value.clone())?;
                Ok(Some(data))
            }
            None => Ok(None),
        }
    }

    pub fn save<T: Serialize>(&self, key: &str, data: &T) -> Result<(), StoreError> {
        let store = StoreBuilder::new(self.app_handle, self.file_path.clone())
            .build()
            .map_err(|e| StoreError::Store(e.to_string()))?;

        let serialized = serde_json::to_value(data)?;
        store.set(key.to_string(), serialized);
        store.save()?;

        Ok(())
    }

    pub fn delete(&self, key: &str) -> Result<(), StoreError> {
        let store = StoreBuilder::new(self.app_handle, self.file_path.clone())
            .build()
            .map_err(|e| StoreError::Store(e.to_string()))?;

        store.delete(key.to_string());
        store.save()?;

        Ok(())
    }
}

// Generic command handler macro
macro_rules! create_store_command {
    ($name:ident, $key:expr, $type:ty, $file_path:expr) => {
        #[tauri::command]
        pub fn $name(app_handle: tauri::AppHandle<tauri::Wry>) -> Result<Option<$type>, String> {
            let manager = StoreManager::new(&app_handle, $file_path)
                .map_err(|e| e.to_string())?;

            manager.load($key)
                .map_err(|e| e.to_string())
        }
    };

    ($save_name:ident, $key:expr, $type:ty, $file_path:expr) => {
        #[tauri::command]
        pub fn $save_name(app_handle: tauri::AppHandle<tauri::Wry>, payload: $type) -> Result<(), String> {
            let manager = StoreManager::new(&app_handle, $file_path)
                .map_err(|e| e.to_string())?;

            manager.save($key, &payload)
                .map_err(|e| e.to_string())
        }
    };
}

// Constants for file paths (to be moved to constants.rs)
pub const ASSETS_FILE: &str = "assets.json";
pub const IDENTITY_FILE: &str = "identity.json";
pub const LICENSE_FILE: &str = "license.json";
pub const MNEMONIC_FILE: &str = "mnemonic.json";
pub const SAFU_FILE: &str = "safu.json"; // Combined mnemonic & keys
pub const SETTINGS_FILE: &str = "settings.json";
