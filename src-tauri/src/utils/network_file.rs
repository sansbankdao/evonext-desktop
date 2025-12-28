// src-tauri/src/utils/network_file.rs

use crate::constants::{
    ASSETS_MAINNET_FILE, ASSETS_TESTNET_FILE,
    SAFU_MAINNET_FILE, SAFU_TESTNET_FILE,
    IDENTITY_MAINNET_FILE, IDENTITY_TESTNET_FILE
};

/// Get the correct filename based on network and file type
pub fn get_network_file(network: &str, file_type: &str) -> Result<&'static str, String> {
    match (network, file_type) {
        ("mainnet", "assets") => Ok(ASSETS_MAINNET_FILE),
        ("testnet", "assets") => Ok(ASSETS_TESTNET_FILE),

        ("mainnet", "safu") => Ok(SAFU_MAINNET_FILE),
        ("testnet", "safu") => Ok(SAFU_TESTNET_FILE),

        ("mainnet", "identity") => Ok(IDENTITY_MAINNET_FILE),
        ("testnet", "identity") => Ok(IDENTITY_TESTNET_FILE),

        ("mainnet", "mnemonic") => Ok(SAFU_MAINNET_FILE), // Same as safu files
        ("testnet", "mnemonic") => Ok(SAFU_TESTNET_FILE),

        _ => Err(format!(
            "Invalid network '{}' or file type '{}'. Must be 'mainnet'/'testnet' and one of: assets, safu, identity, mnemonic",
            network, file_type
        )),
    }
}
