// src-tauri/src/utils/network_file.rs

// src-tauri/src/utils/network_file.rs

use crate::constants::{
    ASSETS_MAINNET_FILE, ASSETS_TESTNET_FILE, DISCOVERED_MAINNET_FILE, DISCOVERED_TESTNET_FILE,
    IDENTITY_MAINNET_FILE, IDENTITY_TESTNET_FILE, SAFU_MAINNET_FILE, SAFU_TESTNET_FILE,
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
        ("mainnet", "mnemonic") => Ok(SAFU_MAINNET_FILE),
        ("testnet", "mnemonic") => Ok(SAFU_TESTNET_FILE),
        ("mainnet", "discovered") => Ok(DISCOVERED_MAINNET_FILE),
        ("testnet", "discovered") => Ok(DISCOVERED_TESTNET_FILE),
        _ => Err(format!(
            "Invalid network '{}' or file type '{}'. Must be 'mainnet'/'testnet' and one of: assets, safu, identity, mnemonic, discovered",
            network, file_type
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_network_file_valid() {
        assert_eq!(
            get_network_file("mainnet", "assets").unwrap(),
            ASSETS_MAINNET_FILE
        );
        assert_eq!(
            get_network_file("testnet", "assets").unwrap(),
            ASSETS_TESTNET_FILE
        );
        assert_eq!(
            get_network_file("mainnet", "safu").unwrap(),
            SAFU_MAINNET_FILE
        );
        assert_eq!(
            get_network_file("testnet", "safu").unwrap(),
            SAFU_TESTNET_FILE
        );
        assert_eq!(
            get_network_file("mainnet", "identity").unwrap(),
            IDENTITY_MAINNET_FILE
        );
        assert_eq!(
            get_network_file("testnet", "identity").unwrap(),
            IDENTITY_TESTNET_FILE
        );
        assert_eq!(
            get_network_file("mainnet", "mnemonic").unwrap(),
            SAFU_MAINNET_FILE
        );
        assert_eq!(
            get_network_file("testnet", "mnemonic").unwrap(),
            SAFU_TESTNET_FILE
        );
        assert_eq!(
            get_network_file("mainnet", "discovered").unwrap(),
            DISCOVERED_MAINNET_FILE
        );
        assert_eq!(
            get_network_file("testnet", "discovered").unwrap(),
            DISCOVERED_TESTNET_FILE
        );
    }

    #[test]
    fn test_get_network_file_invalid_network() {
        let result = get_network_file("devnet", "assets");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("Invalid network 'devnet'"));
    }

    #[test]
    fn test_get_network_file_invalid_type() {
        let result = get_network_file("mainnet", "unknown");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("file type 'unknown'"));
    }
}
