use tauri::{AppHandle, Wry};
use crate::models::AssetDefinition;
use crate::utils::{StoreManager, network_file::get_network_file};
use serde_json::Value;

pub type IAssets = Vec<AssetDefinition>;

#[tauri::command]
pub fn discover_assets(app_handle: AppHandle<Wry>, identity_id: String, network: String) -> Result<IAssets, String> {
    println!("🕵️♂️ [discover_assets] =========================================");
    println!("🔍 [discover_assets] ARGUMENTS: network='{}', identity_id='{}'", network, identity_id);

    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    let mut new_assets: IAssets = Vec::new();

    println!("📍 [discover_assets] Using Identity ID: {}", identity_id);

    // Construct Explorer URL with correct domain
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
            println!("📡 [discover_assets] HTTP Status: {}", resp.status());
            if resp.status().is_success() {
                match resp.text() {
                    Ok(body) => {
                        println!("📨 [discover_assets] Raw response (first 200 chars): {}",
                                 &body[..body.len().min(200)]);
                        body
                    }
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

                let get_str = |key: &str| -> Option<String> {
                    item.get(key)
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                };

                // Get symbol from localizations.en.singularForm (primary) or pluralForm (fallback)
                let symbol = item.get("localizations")
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
                    println!("   ⚠️ Skipping - could not determine symbol from localizations");
                    continue;
                }

                // Use the symbol as the name as well
                let name = symbol.clone();

                // Get contract ID - try multiple fields
                let contract_id = get_str("dataContractIdentifier")
                    .or_else(|| get_str("identifier"))
                    .unwrap_or_else(|| "".to_string());

                if contract_id.is_empty() {
                    println!("   ⚠️ Skipping - no contract ID or identifier");
                    continue;
                }

                // Get decimals
                let decimals = item.get("decimals")
                    .and_then(|v| v.as_u64())
                    .map(|val| val as u8)
                    .unwrap_or(8);

                // Get balance
                let balance_str = get_str("balance").unwrap_or_else(|| "0".to_string());
                let balance = balance_str.parse::<u64>().unwrap_or(0);

                println!("   ✅ Name/Symbol: {}", name);
                println!("   ✅ Contract Id: {}", contract_id);
                println!("   ✅ Decimals: {}", decimals);
                println!("   ✅ Balance: {}", balance);
                println!("   ✅ Balance string: {}", balance_str);

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
        None => {
            println!("⚠️  [discover_assets] No 'resultSet' key found in response.");
            if let Some(obj) = data.as_object() {
                println!("📊 Available top-level keys: {:?}", obj.keys().collect::<Vec<_>>());
            }
            return Ok(new_assets);
        }
        _ => {
            println!("⚠️  [discover_assets] 'resultSet' is not an array.");
            return Ok(new_assets);
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

    println!("🏁 [discover_assets] Returning {} assets", new_assets.len());
    Ok(new_assets)
}

#[tauri::command]
pub fn fetch_identity_tokens(app_handle: AppHandle<Wry>, identity_id: String, network: String) -> Result<IAssets, String> {
    println!("🔍 [fetch_identity_tokens] =========================================");
    println!("🔍 [fetch_identity_tokens] ARGUMENTS: identity_id='{}', network='{}'", identity_id, network);

    let manager = StoreManager::new(&app_handle);
    let mut new_assets: IAssets = Vec::new();

    // Construct Explorer URL with correct domain
    let base_url = if network.to_lowercase() == "mainnet" {
        "https://platform-explorer.pshenmic.dev"
    } else {
        "https://testnet.platform-explorer.pshenmic.dev"
    };

    let explorer_url = format!("{}/identity/{}/tokens?page=1&limit=10&order=asc", base_url, identity_id);
    println!("📡 [fetch_identity_tokens] GET Request: {}", explorer_url);

    // Fetch Data (Blocking)
    let response_body = match reqwest::blocking::get(&explorer_url) {
        Ok(resp) => {
            println!("📡 [fetch_identity_tokens] HTTP Status: {}", resp.status());
            if resp.status().is_success() {
                match resp.text() {
                    Ok(body) => {
                        println!("📨 [fetch_identity_tokens] Raw response (first 200 chars): {}",
                                 &body[..body.len().min(200)]);
                        body
                    }
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

    // Log all top-level keys for debugging
    if let Some(obj) = data.as_object() {
        println!("📊 [fetch_identity_tokens] Top-level keys: {:?}", obj.keys().collect::<Vec<_>>());
    }

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

                // DEBUG: Log all keys in the item
                if let Some(obj) = item.as_object() {
                    println!("   🔑 Available keys: {:?}", obj.keys().collect::<Vec<_>>());
                }

                // Get symbol from localizations.en.singularForm (primary) or pluralForm (fallback)
                let symbol = item.get("localizations")
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
                    println!("   ⚠️ Skipping - could not determine symbol from localizations");
                    continue;
                }

                // Use the symbol as the name as well (as requested)
                let name = symbol.clone();

                println!("   ✅ Name/Symbol: {}", name);

                // Get contract ID - try multiple fields
                let contract_id = get_str("dataContractIdentifier")
                    .or_else(|| get_str("identifier"))
                    .unwrap_or_else(|| "".to_string());

                if contract_id.is_empty() {
                    println!("   ⚠️ Skipping item - no contract ID or identifier");
                    continue;
                }

                // Get decimals
                let decimals = item.get("decimals")
                    .and_then(|v| v.as_u64())
                    .map(|val| val as u8)
                    .unwrap_or(8);

                // Get balance
                let balance_str = get_str("balance").unwrap_or_else(|| "0".to_string());
                let balance = balance_str.parse::<u64>().unwrap_or(0);

                println!("   ✅ Contract Id: {}", contract_id);
                println!("   ✅ Decimals: {}", decimals);
                println!("   ✅ Balance: {}", balance);
                println!("   ✅ Balance string: {}", balance_str);

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
        None => {
            println!("⚠️  [fetch_identity_tokens] No 'resultSet' key found in response.");
            // Debug: print the entire response to see what we got
            println!("📄 [fetch_identity_tokens] Full response: {}",
                     serde_json::to_string_pretty(&data).unwrap_or_default().chars().take(500).collect::<String>());
            return Ok(Vec::new());
        }
        Some(_) => {
            println!("⚠️  [fetch_identity_tokens] 'resultSet' is not an array.");
            return Ok(Vec::new());
        }
    }

    println!("🏁 [fetch_identity_tokens] Processed {} items, created {} assets.",
             data.get("resultSet").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0),
             new_assets.len());

    // Log what we're returning
    if new_assets.is_empty() {
        println!("⚠️  [fetch_identity_tokens] Warning: Returning empty asset list!");
    } else {
        println!("📋 [fetch_identity_tokens] Returning assets:");
        for (i, asset) in new_assets.iter().enumerate() {
            println!("   {}. {} ({}) - Balance: {}",
                     i + 1, asset.name, asset.symbol, asset.balance.unwrap_or(0));
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
pub fn load_assets(app_handle: AppHandle<Wry>, identity_id: String, network: String) -> Result<IAssets, String> {
    println!("📂 [load_assets] ===========================================");
    println!("🔍 [load_assets] Loading assets for identity: {} on network: {}", identity_id, network);

    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;

    match manager.load::<IAssets>(filename, "assets") {
        Ok(data) => {
            if let Some(assets) = data {
                // Filter by identity_id
                let filtered: IAssets = assets.into_iter()
                    .filter(|a| a.identity_id == identity_id)
                    .collect();
                println!("✅ [load_assets] Loaded {} assets for {}", filtered.len(), identity_id);
                Ok(filtered)
            } else {
                println!("⚠️  [load_assets] Cache empty for {}", identity_id);
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
