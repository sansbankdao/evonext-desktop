use std::path::PathBuf;
use tauri::{AppHandle, Manager, Wry};
use tauri_plugin_store::{Store, StoreBuilder};

// 1. Define a Rust struct that MIRRORS your TypeScript interface.
//    The `Serialize` and `Deserialize` traits are essential for converting
//    the struct to and from JSON format for storage.
#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct NotificationSettings {
    messages: bool,
    mentions: bool,
    contactRequests: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct ProfileSettings {
    displayName: String,
    username: String,
    bio: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct AppSettings {
    theme: String,
    notifications: NotificationSettings,
    profile: ProfileSettings,
}

// The path to the settings file. ".settings" will be created
// in your app's sandboxed data directory.
const SETTINGS_FILE: &str = ".settings.dat";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_settings_from_backend,
            save_settings_to_backend
        ])
        .run(tauri::generate_context!())
        .expect("Oops! There was an error while running EvoNext.");
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_settings_to_backend(app_handle: AppHandle<Wry>, settings: AppSettings) -> Result<(), String> {
    let path = SETTINGS_FILE.parse::<PathBuf>().unwrap();
    let mut store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("settings".to_string(), serde_json::to_value(settings).unwrap());

    // The .save() method DOES return a Result, so we keep the error handling.
    store.save().map_err(|e| e.to_string())?;

    println!("Settings saved successfully.");
    Ok(())
}

#[tauri::command]
fn load_settings_from_backend(app_handle: AppHandle<Wry>) -> Result<Option<AppSettings>, String> {
    // --- FIX 1: Provide a type hint for .parse() ---
    let path = SETTINGS_FILE.parse::<PathBuf>().unwrap();
    let mut store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(json_value) = store.get("settings") {
        let settings: AppSettings = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        println!("Settings loaded successfully.");
        Ok(Some(settings))
    } else {
        println!("No settings found, returning default.");
        Ok(None)
    }
}
