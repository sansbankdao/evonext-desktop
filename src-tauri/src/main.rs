// src-tauri/src/main.rs

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
#[cfg(test)]

mod tests;

fn main() {
    setup_environment();
    evonext::run();
}

pub(crate) fn setup_environment() {
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        std::env::set_var("TOUCH_LEAN_MODE", "0");
    }
}
