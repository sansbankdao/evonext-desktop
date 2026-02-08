// src-tauri/src/commands/asset_commands.rs

use tauri::{AppHandle, Runtime};
use serde_json::Value;
use crate::models::{IAssetDefinition, IAssetStoreMap, IAssets};
use crate::utils::{StoreManager, network_file::get_network_file};
use crate::identity::storage::{load_identity_map, save_identity_map};

#[tauri::command]
pub fn discover_assets<R: Runtime>(
    app_handle: AppHandle<R>,
    identity_id: String,
    network: String
) -> Result<IAssets, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    let mut new_assets: IAssets = Vec::new();

    let base_url = if network.to_lowercase() == "mainnet" {
        "https://platform-explorer.pshenmic.dev"
    } else {
        "https://testnet.platform-explorer.pshenmic.dev"
    };

    let explorer_url = format!("{}/identity/{}/tokens?page=1&limit=10", base_url, identity_id);

    let response_body = match reqwest::blocking::get(&explorer_url) {
        Ok(resp) => {
            if resp.status().is_success() {
                resp.text().map_err(|e| format!("Network read error: {}", e))?
            } else {
                return Err(format!("API error: {}", resp.status()));
            }
        }
        Err(e) => return Err(e.to_string()),
    };

    if !response_body.is_empty() {
        let data: Value = serde_json::from_str(&response_body).map_err(|e| e.to_string())?;
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
                    .unwrap_or_else(|| "UNKNOWN".to_string());

                let contract_id = get_str("dataContractIdentifier")
                    .or_else(|| get_str("identifier"))
                    .unwrap_or_default();

                if symbol == "UNKNOWN" || contract_id.is_empty() { continue; }

                let decimals = item.get("decimals").and_then(|v| v.as_u64()).map(|val| val as u8).unwrap_or(8);
                let balance = get_str("balance").and_then(|s| s.parse::<u64>().ok()).unwrap_or(0);

                new_assets.push(IAssetDefinition {
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

    let mut asset_map: IAssetStoreMap = manager.load(filename, "assets").unwrap_or_default().unwrap_or_default();
    asset_map.insert(identity_id, new_assets.clone());
    let _ = manager.save(filename, "assets", &asset_map);

    Ok(new_assets)
}

#[tauri::command]
pub async fn fetch_identity_tokens<R: Runtime>(
    app: AppHandle<R>,
    identity_id: String,
    network: String,
) -> Result<IAssets, String> {
    let base_url = match network.as_str() {
        "testnet" => "https://testnet.platform-explorer.pshenmic.dev",
        "mainnet" => "https://platform-explorer.pshenmic.dev",
        _ => return Err("Unsupported network".to_string()),
    };

    let url = format!("{}/identity/{}/tokens?page=1&limit=10&order=asc", base_url, identity_id);
    let response = reqwest::get(&url).await.map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Explorer status error: {}", response.status()));
    }

    let json_response: Value = response.json().await.map_err(|e| e.to_string())?;
    let mut assets: IAssets = Vec::new();

    if let Some(Value::Array(items)) = json_response.get("resultSet") {
        for item in items {
            let symbol = item.get("localizations").and_then(|l| l.get("en")).and_then(|en| en.get("singularForm")).and_then(|s| s.as_str()).unwrap_or("UNKNOWN");
            let contract_id = item.get("identifier").and_then(|v| v.as_str()).unwrap_or("");

            if symbol == "UNKNOWN" || contract_id.is_empty() { continue; }

            assets.push(IAssetDefinition {
                identity_id: identity_id.clone(),
                name: symbol.to_string(),
                symbol: symbol.to_string(),
                asset_id: Some(contract_id.to_string()),
                decimals: Some(8),
                balance: Some(0),
                network: Some(network.clone()),
            });
        }
    }

    let manager = StoreManager::new(&app);
    let filename = get_network_file(&network, "assets")?;
    let mut asset_map: IAssetStoreMap = manager.load(filename, "assets").unwrap_or_default().unwrap_or_default();
    asset_map.insert(identity_id.clone(), assets.clone());
    manager.save(filename, "assets", &asset_map).map_err(|e| e.to_string())?;

    let mut identities_map = load_identity_map(&app, &network).unwrap_or_default();
    if let Some(identity_data) = identities_map.get_mut(&identity_id) {
        let total: u128 = assets.iter().filter_map(|a| a.balance.map(|b| b as u128)).sum();
        identity_data.balance = total.to_string();
        let _ = save_identity_map(&app, &network, &identities_map, None);
    }

    Ok(assets)
}

#[tauri::command]
pub fn load_assets<R: Runtime>(app_handle: AppHandle<R>, identity_id: String, network: String) -> Result<IAssets, String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    match manager.load::<IAssetStoreMap>(filename, "assets") {
        Ok(Some(map)) => Ok(map.get(&identity_id).cloned().unwrap_or_default()),
        _ => Ok(Vec::new()),
    }
}

#[tauri::command]
pub fn save_assets<R: Runtime>(app_handle: AppHandle<R>, identity_id: String, network: String, payload: IAssets) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    let mut asset_map: IAssetStoreMap = manager.load(filename, "assets").unwrap_or_default().unwrap_or_default();
    asset_map.insert(identity_id, payload);
    manager.save(filename, "assets", &asset_map).map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_assets<R: Runtime>(app_handle: AppHandle<R>, network: String) -> Result<(), String> {
    let manager = StoreManager::new(&app_handle);
    let filename = get_network_file(&network, "assets")?;
    manager.delete(filename, "assets").map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tauri::test::mock_builder;

    #[test]
    fn test_assets_storage_lifecycle() {
        let app = mock_builder().build(tauri::generate_context!()).unwrap();
        let handle = app.handle();
        let id = "test_id".to_string();
        let net = "testnet".to_string();

        let assets = vec![IAssetDefinition {
            identity_id: id.clone(),
            name: "Dash".into(),
            symbol: "DASH".into(),
            balance: Some(100),
            asset_id: Some("id1".into()),
            decimals: Some(8),
            network: Some(net.clone()),
        }];

        let _ = save_assets(handle.clone(), id.clone(), net.clone(), assets);
        let loaded = load_assets(handle.clone(), id.clone(), net.clone()).unwrap();
        assert_eq!(loaded.len(), 1);
        assert_eq!(loaded[0].symbol, "DASH");

        let _ = delete_assets(handle.clone(), net.clone());
        let final_load = load_assets(handle.clone(), id.clone(), net.clone()).unwrap();
        assert_eq!(final_load.len(), 0);
    }
}
