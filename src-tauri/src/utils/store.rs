// src-tauri/src/utils/store.rs

use serde::{de::DeserializeOwned, Serialize};
use std::fmt;
use std::path::PathBuf;
use tauri::{AppHandle, Runtime, path::BaseDirectory, Manager};
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
impl From<tauri_plugin_store::Error> for StoreError {
    fn from(error: tauri_plugin_store::Error) -> Self {
        StoreError::Store(error.to_string())
    }
}
/// A trait to allow mocking the store for unit testing logic without Tauri handles
pub trait PersistentStore {
    fn load_value(&self, file_path: &str, key: &str) -> Result<Option<serde_json::Value>, StoreError>;
    fn save_value(&self, file_path: &str, key: &str, value: serde_json::Value) -> Result<(), StoreError>;
}
pub struct StoreManager<'a, R: Runtime> {
    pub app_handle: &'a AppHandle<R>,
}
impl<'a, R: Runtime> StoreManager<'a, R> {
    pub fn new(app_handle: &'a AppHandle<R>) -> Self {
        Self { app_handle }
    }
    fn resolve_path(&self, file_path: &str) -> Result<PathBuf, StoreError> {
        self.app_handle
            .path()
            .resolve(file_path, BaseDirectory::AppData)
            .map_err(|e| StoreError::InvalidPath(e.to_string()))
    }
    pub fn load<T: DeserializeOwned>(
        &self,
        file_path: impl AsRef<str>,
        key: &str,
    ) -> Result<Option<T>, StoreError> {
        let path = self.resolve_path(file_path.as_ref())?;
        let store = StoreBuilder::new(self.app_handle, path).build()?;
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
        key: &str,
        data: &T,
    ) -> Result<(), StoreError> {
        let path = self.resolve_path(file_path.as_ref())?;
        let store = StoreBuilder::new(self.app_handle, path).build()?;
        let serialized = serde_json::to_value(data)?;
        store.set(key.to_string(), serialized);
        store.save()?;
        Ok(())
    }
    pub fn delete(&self, file_path: impl AsRef<str>, key: &str) -> Result<(), StoreError> {
        let path = self.resolve_path(file_path.as_ref())?;
        let store = StoreBuilder::new(self.app_handle, path).build()?;
        store.delete(key.to_string());
        store.save()?;
        Ok(())
    }
}
impl<'a, R: Runtime> PersistentStore for StoreManager<'a, R> {
    fn load_value(&self, file_path: &str, key: &str) -> Result<Option<serde_json::Value>, StoreError> {
        self.load::<serde_json::Value>(file_path, key)
    }
    fn save_value(&self, file_path: &str, key: &str, value: serde_json::Value) -> Result<(), StoreError> {
        self.save(file_path, key, &value)
    }
}
