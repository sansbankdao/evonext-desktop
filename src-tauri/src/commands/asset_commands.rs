// src-tauri/src/commands/asset_commands.rs

use tauri::AppHandle;
use serde_json::Value;
use reqwest;

use crate::models::{AssetDefinition, AssetStoreMap, IAssets, IdentityData};
use crate::utils::{StoreManager, network_file::get_network_file};
use crate::commands::identity_commands::{load_identities_map, save_identity_data};

#[tauri::command]
pub fn discover_assets(
    app_handle: AppHandle,
    identity_id: String,
    network: String
) -> Result<IAssets, String> {
    println!("🕵️♂️ [discover_assets] Starting discovery for identity: {}", identity_id);

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

    if !response_body.is_empty() {
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
                    name: symbol.clone(),
                    symbol,
                    asset_id: Some(contract_id),
                    decimals: Some(decimals),
                    balance: Some(balance),
                    network: Some(network.clone()),
                });
            }
        }
    }

    // Load existing map, update specific identity entry, and save
    let mut asset_map: AssetStoreMap = manager
        .load(filename, "assets")
        .unwrap_or_default()
        .unwrap_or_default();

    asset_map.insert(identity_id, new_assets.clone());
    let _ = manager.save(filename, "assets", &asset_map);

    Ok(new_assets)
}

#[tauri::command]
pub async fn fetch_identity_tokens(
    app: AppHandle,
    identity_id: String,
    network: String,
) -> Result<IAssets, String> {
    println!("🔍 [fetch_identity_tokens] Fetching tokens for ID: {}", identity_id);

    let base_url = match network.as_str() {
        "testnet" => "https://testnet.platform-explorer.pshenmic.dev",
        "mainnet" => "https://platform-explorer.pshenmic.dev",
        _ => return Err("Unsupported network".to_string()),
    };

    let url = format!("{}/identity/{}/tokens?page=1&limit=10&order=asc", base_url, identity_id);

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

    if let Some(Value::Array(items)) = json_response.get("resultSet") {
        for item in items {
            let get_str = |key: &str| -> Option<String> {
                item.get(key).and_then(|v| v.as_str()).map(|s| s.to_string())
            };

            let symbol = item
                .get("localizations")
                .and_then(|l| l.get("en"))
                .and_then(|en| en.get("singularForm"))
                .and_then(|s| s.as_str())
                .map(|s| s.to_string())
                .unwrap_or_else(|| "UNKNOWN".to_string());

            let contract_id = get_str("dataContractIdentifier")
                .or_else(|| get_str("identifier"))
                .unwrap_or_else(|| "".to_string());

            if symbol == "UNKNOWN" || contract_id.is_empty() {
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
                name: symbol.clone(),
                symbol,
                asset_id: Some(contract_id),
                decimals: Some(decimals),
                balance: Some(balance),
                network: Some(network.clone()),
            });
        }
    }

    // Save to Multi-Identity Asset Store
    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "assets")?;

    let mut asset_map: AssetStoreMap = manager
        .load(filename, "assets")
        .unwrap_or_default()
        .unwrap_or_default();

    asset_map.insert(identity_id.clone(), assets.clone());
    manager
        .save(filename, "assets", &asset_map)
        .map_err(|e| format!("Failed to save assets: {}", e))?;

    // Sync balance back to identity store
    // 1. Load identities map
    let identities_map = load_identities_map(app.clone(), network.clone()).await
        .map_err(|e| format!("Failed to load identities: {}", e))?;

    // 2. Find specific identity
    if let Some(identity_obj) = identities_map.get(&identity_id) {
        // 3. Deserialize IdentityData from JsonValue
        let mut identity_data: IdentityData = serde_json::from_value(identity_obj.clone())
            .map_err(|e| format!("Failed to parse identity data: {}", e))?;

        // 4. Update Balance
        let total_balance: u128 = assets.iter().filter_map(|a| a.balance.map(|b| b as u128)).sum();
        identity_data.balance = Some(total_balance.to_string());

        // 5. Serialize back to Value and save
        let updated_identity_value = serde_json::to_value(&identity_data)
            .map_err(|e| format!("Failed to serialize identity data: {}", e))?;

        save_identity_data(app, network.clone(), updated_identity_value).await
            .map_err(|e| format!("Failed to sync identity: {}", e))?;
    }

    Ok(assets)
}

#[tauri::command]
pub fn load_assets(
    app_handle: AppHandle,
    identity_id: String,
    network: String
) -> Result<IAssets, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    match manager.load::<AssetStoreMap>(filename, "assets") {
        Ok(Some(map)) => {
            Ok(map.get(&identity_id).cloned().unwrap_or_default())
        }
        _ => Ok(Vec::new()),
    }
}

#[tauri::command]
pub fn save_assets(
    app_handle: AppHandle,
    identity_id: String,
    network: String,
    payload: IAssets
) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    let mut asset_map: AssetStoreMap = manager
        .load(filename, "assets")
        .unwrap_or_default()
        .unwrap_or_default();

    asset_map.insert(identity_id, payload);

    match manager.save(filename, "assets", &asset_map) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn delete_assets(app_handle: AppHandle, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    match manager.delete(filename, "assets") {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
