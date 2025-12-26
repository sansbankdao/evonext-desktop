// src-tauri/src/dapi/mod.rs

pub mod client;
pub mod types;

// Re-export for easier access
pub use client::DAPIClient;
pub use types::*;
