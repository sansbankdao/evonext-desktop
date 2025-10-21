use std::path::PathBuf;
use tauri::{AppHandle, Wry};
use tauri_plugin_store::{StoreBuilder};

use tauri::{Emitter, Manager};
use tauri::{
    menu::{CheckMenuItemBuilder, MenuBuilder, MenuItem, SubmenuBuilder},
    tray::TrayIconBuilder,
};

/* Initialize data structures. */
#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct AppSettings {
    theme: String,
    notifications: NotificationSettings,
    profile: ProfileSettings,
}


#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct IPrivateKey {
    identity_id: String,
    private_key: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct IMnemonic {
    mnemonic: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct NotificationSettings {
    messages: bool,
    mentions: bool,
    contact_requests: bool,
}

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct ProfileSettings {
    display_name: String,
    username: String,
    bio: String,
}

/* Initialize store data paths. */
// NOTE: Located in the app's "sandboxed" data directory.
const SAFU_FILE: &str = ".safu.dat";
const SETTINGS_FILE: &str = ".settings.dat";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,

            load_mnemonic,
            save_mnemonic,

            load_private_key,
            save_private_key,

            load_settings_from_backend,
            save_settings_to_backend
        ])
        .setup(|app| {
            /* Initialize application menus */
            let identities_menu = SubmenuBuilder::new(app, "Identity")
                .text("connect", "Connect an Identity...")
                .text("register", "Register a New Identity...")
                .separator()
                .text("exit", "Exit")
                .build()?;

            let check_privacy_item = CheckMenuItemBuilder::new("Display balances").id("balance").checked(true).build(app)?;
            let settings_menu = SubmenuBuilder::new(app, "Settings").item(&check_privacy_item).build()?;

            let help_menu = SubmenuBuilder::new(app, "Help")
                .text("bootstrap", "Bootstrap Campaign")
                .text("about", "About")
                .build()?;

            let app_menu = MenuBuilder::new(app)
                .items(&[&identities_menu, &settings_menu, &help_menu])
                .build()?;
            app.set_menu(app_menu)?;

            /* Create the tray icon and its menu */
            let tray_menu = MenuBuilder::new(app)
                .item(&MenuItem::with_id(app, "open", "Open", true, None::<&str>)?)
                .separator()
                .item(&MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?)
                .build()?;

            let icon_path = app.handle().path().resolve("icons/icon.png", tauri::path::BaseDirectory::Resource)?;
            let _tray = TrayIconBuilder::new()
                .icon(tauri::image::Image::from_path(icon_path)?)
                .menu(&tray_menu)
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "open" => {
                           if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                           }
                        }
                        "exit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(window) = app.get_webview_window("main") {
                match event.id().as_ref() {
                    "about" => {
                        window.emit("navigate", "/about").unwrap();
                    }
                    "bootstrap" => {
                        window.emit("navigate", "/bootstrap").unwrap();
                    }
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Oops! There was an error while running EvoNext.");
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save_mnemonic(app_handle: AppHandle<Wry>, payload: IMnemonic) -> Result<(), String> {
    let path = SAFU_FILE.parse::<PathBuf>().unwrap();

    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("mnemonic".to_string(), serde_json::to_value(payload).unwrap());

    store.save().map_err(|e| e.to_string())?;

    println!("Mnemonic phrase saved successfully.");
    Ok(())
}

#[tauri::command]
fn load_mnemonic(app_handle: AppHandle<Wry>) -> Result<Option<IMnemonic>, String> {
    let path = SAFU_FILE.parse::<PathBuf>().unwrap();

    let store = StoreBuilder::new(&app_handle, path)
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

#[tauri::command]
fn save_private_key(app_handle: AppHandle<Wry>, payload: IPrivateKey) -> Result<(), String> {
    let path = SAFU_FILE.parse::<PathBuf>().unwrap();

    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("keys".to_string(), serde_json::to_value(payload).unwrap());

    store.save().map_err(|e| e.to_string())?;

    println!("Private key saved successfully.");
    Ok(())
}

#[tauri::command]
fn load_private_key(app_handle: AppHandle<Wry>) -> Result<Option<IPrivateKey>, String> {
    let path = SAFU_FILE.parse::<PathBuf>().unwrap();

    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    if let Some(json_value) = store.get("keys") {
        let payload: IPrivateKey = serde_json::from_value(json_value.clone())
            .map_err(|e| e.to_string())?;
        println!("Private keys loaded successfully.");
        Ok(Some(payload))
    } else {
        println!("NO private keys found, returning default.");
        Ok(None)
    }
}

#[tauri::command]
fn save_settings_to_backend(app_handle: AppHandle<Wry>, settings: AppSettings) -> Result<(), String> {
    let path = SETTINGS_FILE.parse::<PathBuf>().unwrap();

    let store = StoreBuilder::new(&app_handle, path)
        .build()
        .map_err(|e| e.to_string())?;

    store.set("settings".to_string(), serde_json::to_value(settings).unwrap());

    store.save().map_err(|e| e.to_string())?;

    println!("Application Settings saved successfully.");
    Ok(())
}

#[tauri::command]
fn load_settings_from_backend(app_handle: AppHandle<Wry>) -> Result<Option<AppSettings>, String> {
    let path = SETTINGS_FILE.parse::<PathBuf>().unwrap();

    let store = StoreBuilder::new(&app_handle, path)
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
