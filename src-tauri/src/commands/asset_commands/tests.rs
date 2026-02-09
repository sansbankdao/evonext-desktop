// src-tauri/src/commands/asset_commands/tests.rs

use super::*;
use crate::models::IAssetDefinition;
use serde_json::json;
use tauri::test::{mock_builder};

#[test]
fn test_parse_assets_snapshot_regression() {
    let mock_api_items = vec![
        json!({
            "identifier": "DUSD_ID",
            "decimals": 6,
            "balance": "1500000",
            "localizations": { "en": { "singularForm": "Dashpool USD" } }
        })
    ];

    let assets = parse_assets_from_json(&mock_api_items, "identity_123", "testnet");

    assert_eq!(assets.len(), 1);
    assert_eq!(assets[0].symbol, "Dashpool USD");
    assert_eq!(assets[0].balance, Some("1500000".to_string()));
}

#[test]
fn test_parse_assets_handles_empty_fields() {
    let mock_api_items = vec![
        json!({
            "identifier": "",
            "localizations": { "en": { "singularForm": "Broken" } }
        })
    ];

    let assets = parse_assets_from_json(&mock_api_items, "id", "testnet");
    assert_eq!(assets.len(), 0);
}

#[test]
fn test_assets_command_storage_cycle() {
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(tauri::generate_context!())
        .unwrap();

    // Fix: In tests, the handle should match the concrete AppHandle of the app
    let handle = app.handle().clone();

    let id = "test_id".to_string();
    let net = "testnet".to_string();

    let assets = vec![IAssetDefinition {
        identity_id: id.clone(),
        name: "Dash".into(),
        symbol: "DASH".into(),
        // FIX: Numeric literal must be a String
        balance: Some("100".into()),
        asset_id: Some("id1".into()),
        decimals: Some(8),
        network: Some(net.clone()),
    }];

    // Test Save - Remove generics to satisfy concrete signature
    let save_res = save_assets(handle.clone(), id.clone(), net.clone(), assets);
    assert!(save_res.is_ok());

    // Test Load
    let loaded = load_assets(handle.clone(), id.clone(), net.clone()).unwrap();
    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded[0].symbol, "DASH");

    // Test Delete
    let _ = delete_assets(handle.clone(), net.clone());
    let final_load = load_assets(handle, id.clone(), net.clone()).unwrap();
    assert_eq!(final_load.len(), 0);
}
