// src-tauri/src/commands/mod.rs

use crate::utils::store::{StoreManager, create_store_command};

// Asset commands
create_store_command!(load_assets, "assets", crate::models::IAssets, "assets.json");
create_store_command!(save_assets, "assets", crate::models::IAssets, "assets.json");

// Identity commands
create_store_command!(load_private_keys, "keys", crate::models::IPrivateKeys, "safu.json");
create_store_command!(save_private_keys, "keys", crate::models::IPrivateKeys, "safu.json");
create_store_command!(load_identity_data, "identity", crate::models::IdentityData, "identity.json");
create_store_command!(save_identity_data, "identity", crate::models::IdentityData, "identity.json");

// License commands
create_store_command!(load_license, "license", crate::models::ILicense, "license.json");
create_store_command!(save_license, "license", crate::models::ILicense, "license.json");

// Mnemonic commands
create_store_command!(load_mnemonic, "mnemonic", crate::models::IMnemonic, "mnemonic.json");
create_store_command!(save_mnemonic, "mnemonic", crate::models::IMnemonic, "mnemonic.json");

// Settings commands
create_store_command!(load_settings, "settings", crate::models::IAppSettings, "settings.json");
create_store_command!(save_settings, "settings", crate::models::IAppSettings, "settings.json");

// Export all commands
pub mod asset_commands {
    pub use super::{load_assets, save_assets};
}

pub mod identity_commands {
    pub use super::{load_private_keys, save_private_keys, load_identity_data, save_identity_data};
}

pub mod license_commands {
    pub use super::{load_license, save_license};
}

pub mod mnemonic_commands {
    pub use super::{load_mnemonic, save_mnemonic};
}

pub mod settings_commands {
    pub use super::{load_settings, save_settings};
}

// Identity details commands remain as-is due to custom logic
pub mod identity_details_commands;
