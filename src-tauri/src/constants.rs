// src-tauri/src/constants.rs

// -----------------------------------------------------------------------------
// APPLICATION FILES
// -----------------------------------------------------------------------------
pub const ASSETS_MAINNET_FILE: &str = ".assets-mainnet.json";
pub const ASSETS_TESTNET_FILE: &str = ".assets-testnet.json";
pub const LICENSE_FILE: &str = ".license.json";
pub const SAFU_MAINNET_FILE: &str = ".safu-mainnet.json";
pub const SAFU_TESTNET_FILE: &str = ".safu-testnet.json";
pub const SETTINGS_FILE: &str = ".settings.json";
pub const IDENTITY_MAINNET_FILE: &str = ".identity-mainnet.json";
pub const IDENTITY_TESTNET_FILE: &str = ".identity-testnet.json";
pub const DISCOVERED_MAINNET_FILE: &str = ".discovered-mainnet.json";
pub const DISCOVERED_TESTNET_FILE: &str = ".discovered-testnet.json";

// -----------------------------------------------------------------------------
// API ENDPOINTS
// -----------------------------------------------------------------------------
pub const DASHSWAP_ENDPOINT: &str = "https://dashswap.xyz/v1";
pub const DAPI_WEB_API_ENDPOINT: &str = "https://dashqt.org/v1/dapi";
pub const PLATFORM_HTTP_API_MAINNET: &str = "https://platform-explorer.pshenmic.dev";
pub const PLATFORM_HTTP_API_TESTNET: &str = "https://testnet.platform-explorer.pshenmic.dev";
pub const UPDATER_ENDPOINT: &str = "https://releases.evonext.app/{{target}}/{{arch}}/{{current_version}}";

// -----------------------------------------------------------------------------
// NETWORK & PLATFORM CONFIG
// -----------------------------------------------------------------------------
// FIX: Changed to u32. 100k fits easily in 32 bits.
pub const MIN_CREDIT_TRANSFER: u32 = 100_000;
pub const DEFAULT_IDENTITY_SEARCH_LIMIT: u8 = 3;
pub const DEFAULT_NETWORK: &str = "testnet";
pub const DEFAULT_QUERY_REGISTRY: bool = false;
pub const DEFAULT_SECURITY_LEVEL: u32 = 0;

// -----------------------------------------------------------------------------
// DATA CONTRACTS
// -----------------------------------------------------------------------------
pub const DUSD_CONTRACT_ID_MAINNET: &str = "DYqxCsuDgYsEAJ2ADnimkwNdL7C4xbe4No4so19X9mmd";
pub const DUSD_CONTRACT_ID_TESTNET: &str = "3oTHkj8nqn82QkZRHkmUmNBX696nzE1rg1fwPRpemEdz";
pub const EVONEXT_CONTRACT_ID_MAINNET: &str = "6fBkKSne1xQ5GCPW9fdwEkH7nk8oYPu48vYiYssWzhX8";
pub const EVONEXT_CONTRACT_ID_TESTNET: &str = "465jdPpFCZefhb4g2k2FpCcrKpPYhJJskDqbGFsKu6wb";
pub const SANS_CONTRACT_ID_MAINNET: &str = "AxAYWyXV6mrm8Sq7vc7wEM18wtL8a8rgj64SM3SDmzsB";
pub const SANS_CONTRACT_ID_TESTNET: &str = "A36eJF2kyYXwxCtJGsgbR3CTAscUFaNxZN19UqUfM1kw";

// -----------------------------------------------------------------------------
// TOKEN DETAILS + METADATA
// -----------------------------------------------------------------------------
pub const DUSD_DECIMAL_PLACES: u8 = 6;
pub const SANS_DECIMAL_PLACES: u8 = 8;

// -----------------------------------------------------------------------------
// MESSAGES
// -----------------------------------------------------------------------------
pub const STORE_LOAD_SUCCESS: &str = "Data loaded successfully.";
pub const STORE_LOAD_NOT_FOUND: &str = "No data found.";
pub const STORE_SAVE_SUCCESS: &str = "Data saved successfully.";

// -----------------------------------------------------------------------------
// DYNAMIC HELPERS
// -----------------------------------------------------------------------------
use crate::dapi::types::Network;

pub fn get_evonext_contract_id(_network: Network) -> &'static str {
    "AyWK6nDVfb8d1ZmkM5MmZZrThbUyWyso1aMeGuuVSfxf"
}
