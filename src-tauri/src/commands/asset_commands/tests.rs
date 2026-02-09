// src-tauri/src/commands/asset_commands/tests.rs

use super::*;
use crate::models::IAssetDefinition;
use serde_json::json;
use tauri::test::{mock_builder, mock_context, MockRuntime, noop_assets};
use tauri::AppHandle;

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
fn test_assets_command_storage_cycle() {
    // 1. mock_context(noop_assets()) provides a Context without using
    //    the generate_context! macro. This eliminates the symbol collision.
    // 2. mock_builder().plugin(...).build(...) ensures that the Store
    //    plugin's managed state is correctly initialized, fixing the panic.
    let app = mock_builder()
        .plugin(tauri_plugin_store::Builder::new().build())
        .build(mock_context(noop_assets()))
        .unwrap();

    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let id = "test_id".to_string();
    let net = "testnet".to_string();

    let assets = vec![IAssetDefinition {
        identity_id: id.clone(),
        name: "Dash".into(),
        symbol: "DASH".into(),
        balance: Some("100".into()),
        asset_id: Some("id1".into()),
        decimals: Some(8),
        network: Some(net.clone()),
    }];

    // Test storage inner logic
    let save_res = save_assets_inner(handle.clone(), id.clone(), net.clone(), assets);
    assert!(save_res.is_ok());

    let loaded = load_assets_inner(handle.clone(), id.clone(), net.clone()).unwrap();
    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded[0].symbol, "DASH");

    let _ = delete_assets_inner(handle.clone(), net.clone());
    let final_load = load_assets_inner(handle.clone(), id.clone(), net.clone()).unwrap();
    assert_eq!(final_load.len(), 0);
}
