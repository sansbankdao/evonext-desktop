use tauri::{AppHandle, Wry};
use crate::models::AssetDefinition;
use crate::utils::{StoreManager, network_file::get_network_file};
use serde_json::Value;

pub type IAssets = Vec<AssetDefinition>;

#[tauri::command]
pub fn discover_assets(app_handle: AppHandle<Wry>, identity_id: Option<String>, network: String) -> Result<IAssets, String> {
    println!("🕵️♂️ [discover_assets] =========================================");
    println!("🔍 [discover_assets] ARGUMENTS: network='{}', identity_id={:?}", network, identity_id);

    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    let mut new_assets: IAssets = Vec::new();

    // Use provided identity_id, or if none provided, we cannot proceed
    let identity_to_use = match identity_id {
        Some(id) => id,
        None => {
            println!("❌ [discover_assets] No Identity ID provided, cannot fetch tokens.");
            return Ok(Vec::new());
        }
    };

    println!("📍 [discover_assets] Using Identity ID: {}", identity_to_use);

    // Construct Explorer URL
    let base_url = if network.to_lowercase() == "mainnet" {
        "https://platform-explorer.com"
    } else {
        "https://testnet.platform-explorer.com"
    };

    let explorer_url = format!("{}/identity/{}/tokens?page=1&limit=10", base_url, identity_to_use);
    println!("📡 [discover_assets] GET Request: {}", explorer_url);

    // Fetch Data (Blocking)
    let response_body = match reqwest::blocking::get(&explorer_url) {
        Ok(resp) => {
            println!("📡 [discover_assets] HTTP Status: {}", resp.status());
            if resp.status().is_success() {
                match resp.text() {
                    Ok(body) => body,
                    Err(e) => {
                        println!("❌ [discover_assets] Failed to read response body: {}", e);
                        return Err(format!("Network read error: {}", e));
                    }
                }
            } else {
                println!("❌ [discover_assets] API Request failed with status: {}", resp.status());
                return Err(format!("API error: {}", resp.status()));
            }
        }
        Err(e) => {
            println!("❌ [discover_assets] Request failed: {}", e);
            return Err(e.to_string());
        }
    };

    // Debug: Print length of response
    println!("📨 [discover_assets] Response Body Size: {} bytes", response_body.len());

    // Early return if we got an "OK" but empty response
    if response_body.is_empty() {
        println!("📭 [discover_assets] Empty response body from explorer.");
        // Save empty array to cache to avoid repeated calls
        let _ = manager.save(filename, "assets", &new_assets);
        return Ok(new_assets);
    }

    // Parse JSON Response
    let data: Value = match serde_json::from_str(&response_body) {
        Ok(d) => {
            println!("✅ [discover_assets] JSON Parsed successfully.");
            d
        }
        Err(e) => {
            println!("❌ [discover_assets] JSON Parse Error: {}", e);
            return Err(format!("JSON parse error: {}", e));
        }
    };

    // Extract "resultSet"
    match data.get("resultSet") {
        Some(Value::Array(items)) => {
            println!("✅ [discover_assets] Found 'resultSet' with {} items.", items.len());

            for (idx, item) in items.iter().enumerate() {
                println!("🧩 [discover_assets] Processing Item #{}", idx);

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
                if name.is_empty() {
                    continue; // Skip unknown tokens
                }

                let symbol = get_str_from_inner("localizations", "singularForm")
                    .or_else(|| get_str_from_inner("localizations", "en"))
                    .unwrap_or_else(|| name.to_uppercase());

                let contract_id = get_str("dataContractIdentifier").unwrap_or_else(|| "".to_string());
                if contract_id.is_empty() {
                    continue; // Skip tokens without contract ID
                }

                let decimals = item.get("decimals")
                    .and_then(|v| v.as_u64())
                    .map(|val| val as u8)
                    .unwrap_or(18);

                let balance = get_str("balance")
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(0);

                println!("   [debug] -> Name: {}", name);
                println!("   [debug] -> Symbol: {}", symbol);
                println!("   [debug] -> Contract Id: {}", contract_id);
                println!("   [debug] -> Decimals: {}", decimals);
                println!("   [debug] -> Balance: {}", balance);

                new_assets.push(AssetDefinition {
                    identity_id: identity_to_use.clone(),
                    name,
                    symbol,
                    asset_id: Some(contract_id),
                    decimals: Some(decimals),
                    balance: Some(balance),
                    network: Some(network.clone()),
                });
            }
        }
        _ => {
            println!("⚠️  [discover_assets] No 'resultSet' key found in response or not an array.");
        }
    }

    println!("💾 [discover_assets] Created {} AssetDefinitions to return.", new_assets.len());

    // Save to Local Store
    match manager.save(filename, "assets", &new_assets) {
        Ok(_) => {
            println!("✅ [discover_assets] Saved {} assets to local cache.", new_assets.len());
        }
        Err(e) => {
            println!("❌ [discover_assets] Failed to save assets to cache: {}. Returning discovered list anyway.", e);
        }
    }

    println!("🏁 [discover_assets] Returning ============================================");
    Ok(new_assets)
}

#[tauri::command]
pub fn fetch_identity_tokens(app_handle: AppHandle<Wry>, identity_id: Option<String>, network: String) -> Result<IAssets, String> {
    println!("🔍 [fetch_identity_tokens] =========================================");
    println!("🔍 [fetch_identity_tokens] ARGUMENTS: identity_id={:?}, network='{}'", identity_id, network);

    let manager = StoreManager::new(&app_handle);
    let mut new_assets: IAssets = Vec::new();

    // Use provided identity_id, or if none provided, we cannot proceed
    let identity_to_use = match identity_id {
        Some(ref id) => id.clone(),
        None => {
            println!("❌ [fetch_identity_tokens] No Identity ID provided, cannot fetch tokens.");
            return Ok(Vec::new());
        }
    };

    // Construct Explorer URL
    let base_url = if network.to_lowercase() == "mainnet" {
        "https://platform-explorer.com"
    } else {
        "https://testnet.platform-explorer.com"
    };

    let explorer_url = format!("{}/identity/{}/tokens?page=1&limit=10&order=asc", base_url, identity_to_use);
    println!("📡 [fetch_identity_tokens] GET Request: {}", explorer_url);

    // Fetch Data (Blocking)
    let response_body = match reqwest::blocking::get(&explorer_url) {
        Ok(resp) => {
            println!("📡 [fetch_identity_tokens] HTTP Status: {}", resp.status());
            if resp.status().is_success() {
                match resp.text() {
                    Ok(body) => body,
                    Err(e) => {
                        println!("❌ [fetch_identity_tokens] Failed to read response body: {}", e);
                        return Err(format!("Network read error: {}", e));
                    }
                }
            } else {
                println!("❌ [fetch_identity_tokens] API Request failed with status: {}", resp.status());
                return Err(format!("API error: {}", resp.status()));
            }
        }
        Err(e) => {
            println!("❌ [fetch_identity_tokens] Request failed: {}", e);
            return Err(e.to_string());
        }
    };

    println!("📨 [fetch_identity_tokens] Response Body Size: {} bytes", response_body.len());

    // Early return if empty
    if response_body.is_empty() {
        println!("📭 [fetch_identity_tokens] Empty response body from explorer.");
        return Ok(Vec::new());
    }

    // Parse JSON
    let data: Value = match serde_json::from_str(&response_body) {
        Ok(d) => {
            println!("✅ [fetch_identity_tokens] JSON Parsed successfully.");
            d
        }
        Err(e) => {
            println!("❌ [fetch_identity_tokens] JSON Parse Error: {}", e);
            return Err(format!("JSON parse error: {}", e));
        }
    };

    // Extract "resultSet"
    match data.get("resultSet") {
        Some(Value::Array(items)) => {
            println!("✅ [fetch_identity_tokens] Found 'resultSet' with {} items.", items.len());

            for (idx, item) in items.iter().enumerate() {
                println!("🧩 [fetch_identity_tokens] Processing Item #{}", idx);

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
                if name.is_empty() {
                    continue;
                }

                let symbol = get_str_from_inner("localizations", "singularForm")
                    .or_else(|| get_str_from_inner("localizations", "pluralForm"))
                    .or_else(|| get_str_from_inner("localizations", "en"))
                    .unwrap_or_else(|| name.to_uppercase());

                let contract_id = get_str("dataContractIdentifier").unwrap_or_else(|| "".to_string());
                if contract_id.is_empty() {
                    continue;
                }

                let decimals = item.get("decimals")
                    .and_then(|v| v.as_u64())
                    .map(|val| val as u8)
                    .unwrap_or(18);

                let balance = get_str("balance")
                    .and_then(|s| s.parse::<u64>().ok())
                    .unwrap_or(0);

                new_assets.push(AssetDefinition {
                    identity_id: identity_to_use.clone(),
                    name,
                    symbol,
                    asset_id: Some(contract_id),
                    decimals: Some(decimals),
                    balance: Some(balance),
                    network: Some(network.clone()),
                });
            }
        }
        _ => {
            println!("⚠️  [fetch_identity_tokens] No 'resultSet' key found or not an array.");
        }
    }

    // Save to cache
    let filename = get_network_file(&network, "tokens")?;
    match manager.save(filename, "tokens", &new_assets) {
        Ok(_) => println!("✅ [fetch_identity_tokens] Saved {} tokens to local cache.", new_assets.len()),
        Err(e) => println!("⚠️  [fetch_identity_tokens] Failed to save cache: {}", e),
    }

    println!("🏁 [fetch_identity_tokens] Returning {} token(s).", new_assets.len());
    Ok(new_assets)
}

#[tauri::command]
pub fn load_assets(app_handle: AppHandle<Wry>, network: String) -> Result<IAssets, String> {
    println!("📂 [load_assets] ===========================================");
    println!("🔍 [load_assets] Network Requested: {}", network);

    // We just load from cache; discovery happens elsewhere
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    match manager.load::<IAssets>(filename, "assets") {
        Ok(data) => {
            if let Some(assets) = data {
                println!("✅ [load_assets] Loaded {} assets from cache.", assets.len());
                Ok(assets)
            } else {
                println!("⚠️  [load_assets] Cache empty. Returning empty.");
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
    println!("🗑️  [delete_assets] Deleting assets for network: {}", network);
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
