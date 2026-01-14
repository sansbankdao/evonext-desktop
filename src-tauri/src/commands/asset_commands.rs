// src-tauri/src/commands/asset_commands.rs

use tauri::{AppHandle};
use serde_json::Value;
use reqwest;

use crate::models::AssetDefinition;
use crate::utils::{StoreManager, network_file::get_network_file};

// Import the Bridge functions
use crate::commands::identity_commands::{load_identities_map, save_identity_data};
// use crate::models::IdentityData;

pub type IAssets = Vec<AssetDefinition>;

#[tauri::command]
pub fn discover_assets(
    app_handle: AppHandle,
    identity_id: String,
    network: String
) -> Result<IAssets, String> {
    println!("🕵️♂️ [discover_assets] =========================================");
    println!("🔍 [discover_assets] ARGUMENTS: network='{}', identity_id='{}'", network, identity_id);

    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    let mut new_assets: IAssets = Vec::new();

    // Construct Explorer URL
    let base_url = if network.to_lowercase() == "mainnet" {
        "https://platform-explorer.pshenmic.dev"
    } else {
        "https://testnet.platform-explorer.pshenmic.dev"
    };

    let explorer_url = format!("{}/identity/{}/tokens?page=1&limit=10", base_url, identity_id);
    println!("📡 [discover_assets] GET Request: {}", explorer_url);

    // Fetch Data (Blocking)
    let response_body = match reqwest::blocking::get(&explorer_url) {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.text() {
                    Ok(body) => body,
                    Err(e) => return Err(format!("Network read error: {}", e)),
                }
            } else {
                return Err(format!("API error: {}", resp.status()));
            }
        }
        Err(e) => return Err(e.to_string()),
    };

    if response_body.is_empty() {
        let _ = manager.save(filename, "assets", &new_assets);
        return Ok(new_assets);
    }

    // Parse JSON Response
    let data: Value = match serde_json::from_str(&response_body) {
        Ok(d) => d,
        Err(e) => return Err(format!("JSON parse error: {}", e)),
    };

    // Extract "resultSet"
    if let Some(Value::Array(items)) = data.get("resultSet") {
        for item in items.iter() {
            let get_str = |key: &str| -> Option<String> {
                item.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
            };

            // Get symbol
            let symbol = item
                .get("localizations")
                .and_then(|l| l.get("en"))
                .and_then(|en| en.get("singularForm"))
                .and_then(|s| s.as_str())
                .map(|s| s.to_string())
                .or_else(|| {
                    item.get("localizations")
                        .and_then(|l| l.get("en"))
                        .and_then(|en| en.get("pluralForm"))
                        .and_then(|s| s.as_str())
                        .map(|s| s.to_string())
                })
                .unwrap_or_else(|| "UNKNOWN".to_string());

            if symbol == "UNKNOWN" || symbol.is_empty() {
                continue;
            }

            let name = symbol.clone();
            let contract_id = get_str("dataContractIdentifier")
                .or_else(|| get_str("identifier"))
                .unwrap_or_else(|| "".to_string());

            if contract_id.is_empty() {
                continue;
            }

            let decimals = item
                .get("decimals")
                .and_then(|v| v.as_u64())
                .map(|val| val as u8)
                .unwrap_or(8);

            let balance_str = get_str("balance").unwrap_or_else(|| "0".to_string());
            let balance = balance_str.parse::<u64>().unwrap_or(0);

            new_assets.push(AssetDefinition {
                identity_id: identity_id.clone(),
                name,
                symbol,
                asset_id: Some(contract_id),
                decimals: Some(decimals),
                balance: Some(balance),
                network: Some(network.clone()),
            });
        }
    }

    // Save to Local Store
    let _ = manager.save(filename, "assets", &new_assets);

    Ok(new_assets)
}

#[tauri::command]
pub async fn fetch_identity_tokens(
    app: AppHandle, // Changed from AppHandle<Wry> for consistency with async identity commands
    identity_id: String,
    network: String,
) -> Result<IAssets, String> {
    println!("🔍 [fetch_identity_tokens] Fetching tokens for ID: {} on network: {}", identity_id, network);

    let base_url = match network.as_str() {
        "testnet" => "https://testnet.platform-explorer.pshenmic.dev",
        "mainnet" => "https://platform-explorer.pshenmic.dev",
        _ => return Err("Unsupported network".to_string()),
    };

    let url = format!("{}/identity/{}/tokens?page=1&limit=10&order=asc", base_url, identity_id);

    // Execute HTTP Request
    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Network request failed: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Explorer returned status: {}", response.status()));
    }

    let json_response: Value = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse JSON response: {}", e))?;

    let mut assets: IAssets = Vec::new();

    // Parse Tokens
    if let Some(Value::Array(items)) = json_response.get("resultSet") {
        for item in items {
            let get_str = |key: &str| -> Option<String> {
                item.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
            };

            // Reusing the robust parsing logic from discover_assets
            let symbol = item
                .get("localizations")
                .and_then(|l| l.get("en"))
                .and_then(|en| en.get("singularForm"))
                .and_then(|s| s.as_str())
                .map(|s| s.to_string())
                .or_else(|| {
                    item.get("localizations")
                        .and_then(|l| l.get("en"))
                        .and_then(|en| en.get("pluralForm"))
                        .and_then(|s| s.as_str())
                        .map(|s| s.to_string())
                })
                .unwrap_or_else(|| "UNKNOWN".to_string());

            if symbol == "UNKNOWN" || symbol.is_empty() {
                continue;
            }

            let name = symbol.clone();
            let contract_id = get_str("dataContractIdentifier")
                .or_else(|| get_str("identifier"))
                .unwrap_or_else(|| "".to_string());

            if contract_id.is_empty() {
                continue;
            }

            let decimals = item
                .get("decimals")
                .and_then(|v| v.as_u64())
                .map(|val| val as u8)
                .unwrap_or(8);

            let balance_str = get_str("balance").unwrap_or_else(|| "0".to_string());
            let balance = balance_str.parse::<u64>().unwrap_or(0);

            assets.push(AssetDefinition {
                identity_id: identity_id.clone(),
                name,
                symbol,
                asset_id: Some(contract_id),
                decimals: Some(decimals),
                balance: Some(balance),
                network: Some(network.clone()),
            });
        }
    }

    println!("📊 [fetch_identity_tokens] Found {} tokens.", assets.len());

    // Save to Asset Store
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "assets")?;
    manager
        .save(filename, "assets", &assets)
        .map_err(|e| format!("Failed to save assets to store: {}", e))?;

    // ============================================================
    // SYNC BACK TO IDENTITY STORE
    // ============================================================

    // FIX 1: Clone app here to prevent the "value moved here" error
    let identities_map = load_identities_map(app.clone(), network.clone()).await
        .map_err(|e| format!("Failed to load identities for update: {}", e))?;

    if let Some(mut identity_data) = identities_map.get(&identity_id).cloned() {
        // Calculate Total Balance
        let total_balance: u128 = assets
            .iter()
            .filter_map(|a| a.balance.map(|b| b as u128))
            .sum();

        identity_data.balance = Some(total_balance.to_string());

        // FIX 2: Clone balance here to prevent "use of partially moved value: identity_data"
        println!("🔄 [fetch_identity_tokens] Syncing balance {} back to identity...", identity_data.balance.clone().unwrap_or_default());

        save_identity_data(app, network, identity_data).await
            .map_err(|e| format!("Failed to sync identity: {}", e))?;

        println!("✅ [fetch_identity_tokens] Identity Store Updated.");
    } else {
        println!("⚠️ [fetch_identity_tokens] Identity {} not found.", identity_id);
    }

    Ok(assets)
}

#[tauri::command]
pub fn load_assets(
    app_handle: AppHandle,
    identity_id: String,
    network: String
) -> Result<IAssets, String> {
    println!("📂 [load_assets] Loading assets for identity: {} on network: {}", identity_id, network);

    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    match manager.load::<IAssets>(filename, "assets") {
        Ok(data) => {
            if let Some(assets) = data {
                let filtered: IAssets = assets.into_iter()
                    .filter(|a| a.identity_id == identity_id)
                    .collect();
                println!("✅ [load_assets] Loaded {} assets for {}", filtered.len(), identity_id);
                Ok(filtered)
            } else {
                Ok(Vec::new())
            }
        }
        Err(e) => {
            println!("❌ [load_assets] Failed to load assets: {}. Returning empty.", e);
            Ok(Vec::new())
        }
    }
}

#[tauri::command]
pub fn save_assets(
    app_handle: AppHandle,
    network: String,
    payload: IAssets
) -> Result<(), String> {
    println!("💾 [save_assets] Saving {} assets for network: {}", payload.len(), network);
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    match manager.save(filename, "assets", &payload) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn delete_assets(app_handle: AppHandle, network: String) -> Result<(), String> {
    println!("🗑️  [delete_assets] Deleting assets for network: {}", network);
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    match manager.delete(filename, "assets") {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
