// src-tauri/src/commands/settings_commands.rs

use crate::constants::SETTINGS_FILE;
use crate::models::IAppSettings;
use crate::utils::StoreManager;
use tauri::{AppHandle, Runtime};

#[tauri::command]
pub fn load_settings<R: Runtime>(app_handle: AppHandle<R>) -> Result<Option<IAppSettings>, String> {
    let manager = StoreManager::new(&app_handle);

    match manager.load(SETTINGS_FILE, "settings") {
        Ok(data) => Ok(data),
        Err(e) => {
            println!("Failed to load settings: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn save_settings<R: Runtime>(app_handle: AppHandle<R>, settings: IAppSettings) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.save(SETTINGS_FILE, "settings", &settings) {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Failed to save settings: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_settings<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);

    match manager.delete(SETTINGS_FILE, "settings") {
        Ok(_) => Ok(()),
        Err(e) => {
            println!("Failed to delete settings: {}", e);
            Err(e.to_string())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{INotificationSettings, IProfileSettings};
    use tauri::test::mock_builder;

    fn create_mock_settings() -> IAppSettings {
        IAppSettings {
            network: "testnet".to_string(),
            theme: "dark".to_string(),
            notifications: INotificationSettings::default(),
            profile: IProfileSettings::default(),
            active_identity_id: Some("test-id".to_string()),
        }
    }

    #[test]
    fn test_settings_lifecycle() {
        let app = mock_builder().build(tauri::generate_context!()).unwrap();
        let handle = app.handle();
        let settings = create_mock_settings();

        let _ = save_settings(handle.clone(), settings.clone());
        let load_res = load_settings(handle.clone()).unwrap();
        assert!(load_res.is_some());
        assert_eq!(load_res.unwrap().theme, "dark");

        let _ = delete_settings(handle.clone());
        let final_load = load_settings(handle.clone()).unwrap();
        assert!(final_load.is_none());
    }
}
