// src-tauri/src/commands/asset_commands.rs
use tauri::{AppHandle, Wry};
use crate::models::{AssetDefinition, IAssets}; // Fixed: Import AssetDefinition
use crate::utils::{StoreManager, network_file::get_network_file};
use serde_json::Value;

#[tauri::command]
pub fn discover_assets(app_handle: AppHandle<Wry>, network: String) -> Result<IAssets, String> {
    println!("🕵 [discover_assets] Starting discovery for network: {}", network);

    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    let mut new_assets: IAssets = Vec::new();

    let base_url = if network == "mainnet" {
        "https://platform-explorer.com"
    } else {
        "https://testnet.platform-explorer.com"
    };

    // TODO: Ideally, pass identity_id from the frontend
    let identity_id = "v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5";

    let explorer_url = format!("{}/identity/{}/tokens?page=1&limit=10", base_url, identity_id);
    println!("🌐 Fetching from: {}", explorer_url);

    // Fetch Data (Blocking)
    let response_body = match reqwest::blocking::get(&explorer_url) {
        Ok(resp) => {
            if resp.status().is_success() {
                match resp.text() {
                    Ok(body) => body,
                    Err(e) => {
                        println!("❌ Failed to read response body: {}", e);
                        return Err(format!("Network read error: {}", e));
                    }
                }
            } else {
                println!("❌ API Request failed with status: {}", resp.status());
                return Err(format!("API error: {}", resp.status()));
            }
        }
        Err(e) => {
            println!("❌ Request failed: {}", e);
            return Err(e.to_string());
        }
    };

    // Parse JSON Response
    let data: Value = match serde_json::from_str(&response_body) {
        Ok(d) => d,
        Err(e) => {
            println!("❌ JSON Parse Error: {}", e);
            return Err(format!("JSON parse error: {}", e));
        }
    };

    // Extract "resultSet"
    if let Value::Object(map) = data {
        if let Some(Value::Array(items)) = map.get("resultSet") {
            println!("✅ Found {} tokens in resultSet.", items.len());

            for item in items {
                // Helper for safe extraction
                let get_str = |key: &str| -> Option<String> {
                    item.get(key)
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                };

                let get_str_from_inner = |key: &str, inner_key: &str| -> Option<String> {
                    item.get(key)
                        .and_then(|v| v.as_object())
                        .and_then(|obj| obj.get(inner_key))
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                };

                let name = get_str("name").unwrap_or_else(|| "".to_string());

                // FIX: Clone to avoid "mutate immutable variable"
                let mut symbol = get_str_from_inner("localizations", "singularForm").unwrap_or_else(|| "".to_string());

                if symbol.is_empty() {
                    symbol = get_str("name").unwrap_or_else(|| "UNK".to_string()).to_uppercase();
                }

                // CRITICAL: Extract Data Contract Identifier
                let contract_id = get_str("dataContractIdentifier").unwrap_or_else(|| "".to_string());

                let decimals: Option<u8> = item.get("decimals")
                    .and_then(|v| v.as_u64())
                    .map(|val| val as u8);

                let precision = decimals.unwrap_or(18);

                println!("📦 Token: {} ({}) | Contract: {} | Decimals: {}", name, symbol, contract_id, precision);

                // FIX: Clone network to avoid move errors
                new_assets.push(AssetDefinition {
                    identity_id: identity_id.to_string(),
                    name,
                    symbol,
                    asset_id: Some(contract_id),
                    decimals: Some(precision),
                    network: Some(network.clone()),
                });
            }
        } else {
            println!("⚠️ No 'resultSet' found in response body.");
        }
    }

    // Save to Local Store
    match manager.save(filename, "assets", &new_assets) {
        Ok(_) => {
            println!("✅ Saved {} assets to local cache.", new_assets.len());
            Ok(new_assets)
        }
        Err(e) => {
            println!("❌ Failed to save assets to cache: {}. Returning discovered list anyway.", e);
            Ok(new_assets)
        }
    }
}

#[tauri::command]
pub fn load_assets(app_handle: AppHandle<Wry>, network: String) -> Result<IAssets, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    // Default Fallback
    let get_defaults = || -> IAssets {
        println!("🛠 [load_assets] No cache found. Returning hardcoded defaults.");
        // FIX: Clone network here as well
        let net = network.clone();
        vec![
            AssetDefinition {
                identity_id: "v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5".to_string(),
                name: "Dash USD".to_string(),
                symbol: "DUSD".to_string(),
                asset_id: Some("GVSuBz2HyorDdnrziwNYhU823QAfUqSB2jTbzhCaiFp".to_string()),
                decimals: Some(6),
                network: Some(net.clone()), // Clone
            },
            AssetDefinition {
                identity_id: "v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5".to_string(),
                name: "Sansnote".to_string(),
                symbol: "SANS".to_string(),
                asset_id: Some("8CkcAPokwFdxEu2tUu2VdLTjgK3eeR1wUGJcxhjsWaDz".to_string()),
                decimals: Some(8),
                network: Some(net),
            },
        ]
    };

    match manager.load::<IAssets>(filename, "assets") {
        Ok(data) => {
            if let Some(assets) = data {
                println!("✅ [load_assets] Loaded {} assets from cache.", assets.len());
                Ok(assets)
            } else {
                println!("⚠️ [load_assets] Cache empty. Using defaults.");
                Ok(get_defaults())
            }
        }
        Err(e) => {
            println!("❌ [load_assets] Failed to load assets: {}. Attempting discovery", e);
            // Attempt discovery on cache miss
            match discover_assets(app_handle, network.clone()) {
                Ok(disc) => {
                    println!("✅ [load_assets] Discovery successful.");
                    Ok(disc)
                }
                Err(_) => {
                    println!("❌ [load_assets] Discovery failed. Using defaults.");
                    Ok(get_defaults())
                }
            }
        }
    }
}

#[tauri::command]
pub fn save_assets(app_handle: AppHandle<Wry>, network: String, payload: IAssets) -> Result<(), String> {
    println!("💾 [save_assets] Saving {} assets for network: {}", payload.len(), network);
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    match manager.save(filename, "assets", &payload) {
        Ok(_) => {
            println!("✅ [save_assets] Assets saved successfully for {}", network);
            Ok(())
        }
        Err(e) => {
            println!("❌ [save_assets] Failed to save assets for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub fn delete_assets(app_handle: AppHandle<Wry>, network: String) -> Result<(), String> {
    println!("🗑️ [delete_assets] Deleting assets for network: {}", network);
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    match manager.delete(filename, "assets") {
        Ok(_) => {
            println!("✅ [delete_assets] Assets deleted successfully for {}.", network);
            Ok(())
        }
        Err(e) => {
            println!("❌ [delete_assets] Failed to delete assets for {}: {}", network, e);
            Err(e.to_string())
        }
    }
}
