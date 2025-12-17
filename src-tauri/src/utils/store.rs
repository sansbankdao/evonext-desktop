// src-tauri/src/utils/store.rs
use serde::{Serialize, de::DeserializeOwned};
use std::fmt;
use std::path::PathBuf;
use tauri::{AppHandle, Wry};
use tauri_plugin_store::StoreBuilder;
#[derive(Debug)]
pub enum StoreError {
    Io(std::io::Error),
    Json(serde_json::Error),
    Store(String),
    InvalidPath(String),
}
impl fmt::Display for StoreError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            StoreError::Io(e) => write!(f, "IO error: {}", e),
            StoreError::Json(e) => write!(f, "JSON error: {}", e),
            StoreError::Store(e) => write!(f, "Store error: {}", e),
            StoreError::InvalidPath(e) => write!(f, "Invalid path: {}", e),
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
    app_handle: &'a AppHandle<Wry>,
}
impl<'a> StoreManager<'a> {
    pub fn new(app_handle: &'a AppHandle<Wry>) -> Self {
        Self { app_handle }
    }
    pub fn load<T: DeserializeOwned>(
        &self,
        file_path: impl AsRef<str>,
        key: &str,
    ) -> Result<Option<T>, StoreError> {
        let path = file_path
            .as_ref()
            .parse::<PathBuf>()
            .map_err(|e| StoreError::InvalidPath(e.to_string()))?;
        let store = StoreBuilder::new(self.app_handle, path)
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
    pub fn save<T: Serialize>(
        &self,
        file_path: impl AsRef<str>,
        key: &str,&T,
    ) -> Result<(), StoreError> {
        let path = file_path
            .as_ref()
            .parse::<PathBuf>()
            .map_err(|e| StoreError::InvalidPath(e.to_string()))?;
        let store = StoreBuilder::new(self.app_handle, path)
            .build()
            .map_err(|e| StoreError::Store(e.to_string()))?;
        let serialized = serde_json::to_value(data)?;
        store.set(key.to_string(), serialized);
        store.save()?;
        Ok(())
    }
    pub fn delete(
        &self,
        file_path: impl AsRef<str>,
        key: &str,
    ) -> Result<(), StoreError> {
        let path = file_path
            .as_ref()
            .parse::<PathBuf>()
            .map_err(|e| StoreError::InvalidPath(e.to_string()))?;
        let store = StoreBuilder::new(self.app_handle, path)
            .build()
            .map_err(|e| StoreError::Store(e.to_string()))?;
        store.delete(key.to_string());
        store.save()?;
        Ok(())
    }
}
