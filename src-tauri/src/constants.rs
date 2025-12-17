// src-tauri/src/constants.rs
pub const ASSETS_FILE: &str = ".assets.json";
pub const LICENSE_FILE: &str = ".license.json";
pub const SAFU_FILE: &str = ".safu.json";
pub const SETTINGS_FILE: &str = ".settings.json";
pub const IDENTITY_FILE: &str = ".identity.json";
pub const MNEMONIC_FILE: &str = ".mnemonic.json";

pub const MIN_CREDIT_TRANSFER: u64 = 100_000;
pub const DEFAULT_IDENTITY_SEARCH_LIMIT: u8 = 3;
pub const DEFAULT_NETWORK: &str = "testnet";

pub const DASHSWAP_ENDPOINT: &str = "https://dashswap.xyz/v1";
pub const DAPI_WEB_API_ENDPOINT: &str = "https://dashqt.org/v1/dapi";

pub const PLATFORM_HTTP_API_MAINNET: &str = "https://platform-explorer.pshenmic.dev";
pub const PLATFORM_HTTP_API_TESTNET: &str = "https://testnet.platform-explorer.pshenmic.dev";

pub const DUSD_CONTRACT_ID_MAINNET: &str = "DYqxCsuDgYsEAJ2ADnimkwNdL7C4xbe4No4so19X9mmd";
pub const DUSD_CONTRACT_ID_TESTNET: &str = "3oTHkj8nqn82QkZRHkmUmNBX696nzE1rg1fwPRpemEdz";

pub const SANS_CONTRACT_ID_MAINNET: &str = "AxAYWyXV6mrm8Sq7vc7wEM18wtL8a8rgj64SM3SDmzsB";
pub const SANS_CONTRACT_ID_TESTNET: &str = "A36eJF2kyYXwxCtJGsgbR3CTAscUFaNxZN199V7dLZ";

pub const DUSD_DECIMAL_PLACES: u8 = 6;
pub const SANS_DECIMAL_PLACES: u8 = 8;

pub const UPDATER_ENDPOINT: &str = "https://releases.evonext.app/{{target}}/{{arch}}/{{current_version}}";

pub const DEFAULT_QUERY_REGISTRY: bool = false;
pub const DEFAULT_SECURITY_LEVEL: u32 = 0;

pub const STORE_LOAD_SUCCESS: &str = "Data loaded successfully.";
pub const STORE_LOAD_NOT_FOUND: &str = "No data found.";
pub const STORE_SAVE_SUCCESS: &str = "Data saved successfully.";
