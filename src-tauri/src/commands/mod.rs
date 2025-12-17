// src-tauri/src/commands/mod.rs
pub mod asset_commands;
pub mod identity_commands;
pub mod identity_details_commands;
pub mod license_commands;
pub mod mnemonic_commands;
pub mod settings_commands;

// Re-export all commands for easy access
pub use asset_commands::*;
pub use identity_commands::*;
pub use identity_details_commands::*;
pub use license_commands::*;
pub use mnemonic_commands::*;
pub use settings_commands::*;
