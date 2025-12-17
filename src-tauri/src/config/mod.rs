// src-tauri/src/config/mod.rs

use serde::Deserialize;

#[derive(Debug, Deserialize, Clone)]
pub struct AppConfig {
    #[serde(default = "default_min_credit_transfer")]
    pub min_credit_transfer: u64,

    #[serde(default = "default_max_search_index")]
    pub max_search_index: u8,

    #[serde(default = "default_network")]
    pub default_network: String,

    #[serde(default = "default_api_endpoints")]
    pub api_endpoints: ApiEndpoints,
}

#[derive(Debug, Deserialize, Clone)]
pub struct ApiEndpoints {
    pub dashswap: String,
    pub dapi_web: String,
    pub platform_mainnet: String,
    pub platform_testnet: String,
}

fn default_min_credit_transfer() -> u64 {
    100_000
}

fn default_max_search_index() -> u8 {
    3
}

fn default_network() -> String {
    "testnet".to_string()
}

fn default_api_endpoints() -> ApiEndpoints {
    ApiEndpoints {
        dashswap: "https://dashswap.xyz/v1".to_string(),
        dapi_web: "https://dashqt.org/v1/dapi".to_string(),
        platform_mainnet: "https://platform-explorer.pshenmic.dev".to_string(),
        platform_testnet: "https://testnet.platform-explorer.pshenmic.dev".to_string(),
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            min_credit_transfer: default_min_credit_transfer(),
            max_search_index: default_max_search_index(),
            default_network: default_network(),
            api_endpoints: default_api_endpoints(),
        }
    }
}
