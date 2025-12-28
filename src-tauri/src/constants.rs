// src-tauri/src/constants.rs

#[allow(dead_code)]
pub const ASSETS_MAINNET_FILE: &str = ".assets-mainnet.json";
#[allow(dead_code)]
pub const ASSETS_TESTNET_FILE: &str = ".assets-testnet.json";
#[allow(dead_code)]
pub const LICENSE_FILE: &str = ".license.json";
#[allow(dead_code)]
pub const SAFU_MAINNET_FILE: &str = ".safu-mainnet.json";
#[allow(dead_code)]
pub const SAFU_TESTNET_FILE: &str = ".safu-testnet.json";
#[allow(dead_code)]
pub const SETTINGS_FILE: &str = ".settings.json";
#[allow(dead_code)]
pub const IDENTITY_MAINNET_FILE: &str = ".identity-mainnet.json";
#[allow(dead_code)]
pub const IDENTITY_TESTNET_FILE: &str = ".identity-testnet.json";

#[allow(dead_code)]
pub const MIN_CREDIT_TRANSFER: u64 = 100_000;
#[allow(dead_code)]
pub const DEFAULT_IDENTITY_SEARCH_LIMIT: u8 = 3;
#[allow(dead_code)]
pub const DEFAULT_NETWORK: &str = "testnet";

#[allow(dead_code)]
pub const DASHSWAP_ENDPOINT: &str = "https://dashswap.xyz/v1";
#[allow(dead_code)]
pub const DAPI_WEB_API_ENDPOINT: &str = "https://dashqt.org/v1/dapi";

#[allow(dead_code)]
pub const PLATFORM_HTTP_API_MAINNET: &str = "https://platform-explorer.pshenmic.dev";
#[allow(dead_code)]
pub const PLATFORM_HTTP_API_TESTNET: &str = "https://testnet.platform-explorer.pshenmic.dev";

// -----------------------------------------------------------------------------
// DATA CONTRACTS
// -----------------------------------------------------------------------------
#[allow(dead_code)]
pub const DUSD_CONTRACT_ID_MAINNET: &str = "DYqxCsuDgYsEAJ2ADnimkwNdL7C4xbe4No4so19X9mmd";
#[allow(dead_code)]
pub const DUSD_CONTRACT_ID_TESTNET: &str = "3oTHkj8nqn82QkZRHkmUmNBX696nzE1rg1fwPRpemEdz";

#[allow(dead_code)]
pub const EVONEXT_CONTRACT_ID_MAINNET: &str = "6fBkKSne1xQ5GCPW9fdwEkH7nk8oYPu48vYiYssWzhX8";
#[allow(dead_code)]
pub const EVONEXT_CONTRACT_ID_TESTNET: &str = "465jdPpFCZefhb4g2k2FpCcrKpPYhJJskDqbGFsKu6wb";

#[allow(dead_code)]
pub const SANS_CONTRACT_ID_MAINNET: &str = "AxAYWyXV6mrm8Sq7vc7wEM18wtL8a8rgj64SM3SDmzsB";
#[allow(dead_code)]
pub const SANS_CONTRACT_ID_TESTNET: &str = "A36eJF2kyYXwxCtJGsgbR3CTAscUFaNxZN199V7dLZ";

// -----------------------------------------------------------------------------
// TOKEN DETAILS + METADATA
// -----------------------------------------------------------------------------
#[allow(dead_code)]
pub const DUSD_DECIMAL_PLACES: u8 = 6;
#[allow(dead_code)]
pub const SANS_DECIMAL_PLACES: u8 = 8;

#[allow(dead_code)]
pub const UPDATER_ENDPOINT: &str = "https://releases.evonext.app/{{target}}/{{arch}}/{{current_version}}";

#[allow(dead_code)]
pub const DEFAULT_QUERY_REGISTRY: bool = false;
#[allow(dead_code)]
pub const DEFAULT_SECURITY_LEVEL: u32 = 0;

#[allow(dead_code)]
pub const STORE_LOAD_SUCCESS: &str = "Data loaded successfully.";
#[allow(dead_code)]
pub const STORE_LOAD_NOT_FOUND: &str = "No data found.";
#[allow(dead_code)]
pub const STORE_SAVE_SUCCESS: &str = "Data saved successfully.";
