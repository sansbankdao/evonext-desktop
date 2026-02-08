// src-tauri/src/utils/macros.rs

#[cfg(test)]
mod tests;

#[macro_export]
macro_rules! create_store_command {
    ($name:ident, $file:expr, $key:expr, $type:ty) => {
        #[tauri::command]
        pub fn $name<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) -> Result<Option<$type>, String> {
            use crate::utils::store::StoreManager;

            let manager = StoreManager::new(&app_handle);
            manager.load($file, $key)
                .map_err(|e| e.to_string())
        }
    };

    ($save_name:ident, $file:expr, $key:expr, $type:ty) => {
        #[tauri::command]
        pub fn $save_name<R: tauri::Runtime>(
            app_handle: tauri::AppHandle<R>,
            payload: $type
        ) -> Result<(), String> {
            use crate::utils::store::StoreManager;

            let manager = StoreManager::new(&app_handle);
            manager.save($file, $key, &payload)
                .map_err(|e| e.to_string())
        }
    };

    ($name:ident, $file:expr, $key:expr, $type:ty, $delete_name:ident) => {
        #[tauri::command]
        pub fn $name<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) -> Result<Option<$type>, String> {
            use crate::utils::store::StoreManager;

            let manager = StoreManager::new(&app_handle);
            manager.load($file, $key)
                .map_err(|e| e.to_string())
        }

        #[tauri::command]
        pub fn $delete_name<R: tauri::Runtime>(app_handle: tauri::AppHandle<R>) -> Result<(), String> {
            use crate::utils::store::StoreManager;

            let manager = StoreManager::new(&app_handle);
            manager.delete($file, $key)
                .map_err(|e| e.to_string())
        }
    };

    ($load_name:ident, $save_name:ident, $file:expr, $key:expr, $type:ty) => {
        create_store_command!($load_name, $file, $key, $type);
        create_store_command!($save_name, $file, $key, $type);
    };

    ($load_name:ident, $save_name:ident, $delete_name:ident, $file:expr, $key:expr, $type:ty) => {
        create_store_command!($load_name, $file, $key, $type, $delete_name);
        create_store_command!($save_name, $file, $key, $type);
    };
}
