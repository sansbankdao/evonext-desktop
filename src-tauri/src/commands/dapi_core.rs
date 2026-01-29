// src-tauri/src/commands/dapi_core.rs

use crate::dapi::client::get_dapi_client;
use crate::dapi::types::Network;
use serde_json::{json, Value};
use std::collections::HashMap;
use tauri::AppHandle;
use tauri::command;
/// Resolves the network string to an enum, defaulting to Testnet if missing or invalid.
/// This ensures all requests use the correct network context.
pub fn resolve_network(network_option: Option<String>) -> Network {
    match network_option {
        Some(net_str) => {
            // We check both 'testnet' and 'mainnet' explicitly
            match net_str.to_lowercase().as_str() {
                "testnet" => Network::Testnet,
                "mainnet" => Network::Mainnet,
                _ => {
                    println!("[DAPI-CORE] Invalid network string '{}', defaulting to Testnet", net_str);
                    Network::Testnet
                }
            }
        }
        None => {
            println!("[DAPI-CORE] No network provided, defaulting to Testnet");
            Network::Testnet
        }
    }
}
/// Helper to log the network being used for a specific operation
pub fn log_network_operation(operation: &str, network: &Network) {
    println!("[DAPI-CORE] {} | network={}", operation, network.as_str());
}
/// Generic wrapper for DAPI requests that require logging and network resolution
#[command]
pub async fn dapi_request(
    app_handle: AppHandle,
    method: String,
    params: HashMap<String, Value>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let current_network = resolve_network(network);
    log_network_operation("dapi_request", &current_network);
    // The specific implementation of building params array remains in other files
    // or we can move a generic helper here if needed later.
    // For now, we just log and return the resolved network for debugging.
    // This command is likely unused directly by frontend now (which uses specific commands),
    // but kept for compatibility or direct low-level access.
    Err("Use specific commands (get_identity_info, etc)".to_string())
}
