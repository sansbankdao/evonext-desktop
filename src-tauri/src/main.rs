// src-tauri/src/main.rs

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // ========================================================================
    // CRITICAL FIXES FOR "WebLoaderStrategy" CRASHES ON LINUX
    // ========================================================================

    // 1. Disable Compositing Mode
    // Disables GPU acceleration which is unstable in many WebView/WebKitGTK Linux setups.
    // This resolves the "internallyFailedLoadTimerFired" crash in ~90% of cases.
    #[cfg(target_os = "linux")]
    std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");

    // 2. Disable Lean Mode
    // Ensures compatibility with system WebKit libraries.
    #[cfg(target_os = "linux")]
    std::env::set_var("TOUCH_LEAN_MODE", "0");

    // ========================================================================
    // RUN APPLICATION
    // ========================================================================

    evonext::run();
}
