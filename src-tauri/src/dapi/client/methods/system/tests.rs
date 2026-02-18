// src-tauri/src/dapi/client/methods/system/tests.rs

use super::*;
use crate::dapi::types::Network;

#[test]
fn test_epoch_progress_math() {
    let epoch = EpochInfo {
        index: "1".to_string(),
        start_height: "1000".to_string(),
        end_height: "2000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    // Halfway (Height 1500)
    assert_eq!(epoch.current_height_within_epoch("1500"), 500);
    assert_eq!(epoch.epoch_progress("1500"), 0.5);
    assert_eq!(epoch.to_display_string("1500"), "Epoch 1 (50%)");

    // Start
    assert_eq!(epoch.epoch_progress("1000"), 0.0);

    // End
    assert_eq!(epoch.epoch_progress("2000"), 1.0);

    // Out of bounds (High)
    assert_eq!(epoch.epoch_progress("3000"), 0.0);
}

#[test]
fn test_epoch_info_deserialization() {
    let data = serde_json::json!({
        "index": 10,
        "startHeight": "5000",
        "endHeight": 6000,
        "firstBlockHeight": "5000",
        "firstCoreBlockHeight": 4000,
        "startTime": 1600000000
    });

    let info: EpochInfo = serde_json::from_value(data).unwrap();

    // Verify everything became a String
    assert_eq!(info.index, "10");
    assert_eq!(info.start_height, "5000");
    assert_eq!(info.end_height, "6000");
}

// ==================== EpochInfo Tests ====================

#[test]
fn test_epoch_info_current_height_at_start() {
    let epoch = EpochInfo {
        index: "5".to_string(),
        start_height: "1000".to_string(),
        end_height: "2000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    assert_eq!(epoch.current_height_within_epoch("1000"), 0);
    assert_eq!(epoch.epoch_progress("1000"), 0.0);
}

#[test]
fn test_epoch_info_current_height_at_end() {
    let epoch = EpochInfo {
        index: "5".to_string(),
        start_height: "1000".to_string(),
        end_height: "2000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    assert_eq!(epoch.current_height_within_epoch("2000"), 1000);
    assert_eq!(epoch.epoch_progress("2000"), 1.0);
}

#[test]
fn test_epoch_info_current_height_before_epoch() {
    let epoch = EpochInfo {
        index: "5".to_string(),
        start_height: "1000".to_string(),
        end_height: "2000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    // Height before epoch starts
    assert_eq!(epoch.current_height_within_epoch("500"), 0);
    assert_eq!(epoch.epoch_progress("500"), 0.0);
}

#[test]
fn test_epoch_info_current_height_after_epoch() {
    let epoch = EpochInfo {
        index: "5".to_string(),
        start_height: "1000".to_string(),
        end_height: "2000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    // Height after epoch ends
    assert_eq!(epoch.current_height_within_epoch("3000"), 0);
    assert_eq!(epoch.epoch_progress("3000"), 0.0);
}

#[test]
fn test_epoch_info_progress_quarter() {
    let epoch = EpochInfo {
        index: "1".to_string(),
        start_height: "0".to_string(),
        end_height: "100".to_string(),
        first_block_height: "0".to_string(),
        first_core_block_height: "0".to_string(),
        start_time: "0".to_string(),
    };

    assert_eq!(epoch.epoch_progress("25"), 0.25);
}

#[test]
fn test_epoch_info_progress_three_quarters() {
    let epoch = EpochInfo {
        index: "1".to_string(),
        start_height: "0".to_string(),
        end_height: "100".to_string(),
        first_block_height: "0".to_string(),
        first_core_block_height: "0".to_string(),
        start_time: "0".to_string(),
    };

    let progress = epoch.epoch_progress("75");
    assert!((progress - 0.75).abs() < 0.001);
}

#[test]
fn test_epoch_info_display_string() {
    let epoch = EpochInfo {
        index: "42".to_string(),
        start_height: "1000".to_string(),
        end_height: "2000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    assert_eq!(epoch.to_display_string("1500"), "Epoch 42 (50%)");
    assert_eq!(epoch.to_display_string("1000"), "Epoch 42 (0%)");
    assert_eq!(epoch.to_display_string("2000"), "Epoch 42 (100%)");
}

#[test]
fn test_epoch_info_invalid_height_string() {
    let epoch = EpochInfo {
        index: "1".to_string(),
        start_height: "1000".to_string(),
        end_height: "2000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    // Invalid height string should return 0
    assert_eq!(epoch.current_height_within_epoch("invalid"), 0);
    assert_eq!(epoch.epoch_progress("invalid"), 0.0);
}

#[test]
fn test_epoch_info_same_start_end_height() {
    let epoch = EpochInfo {
        index: "1".to_string(),
        start_height: "1000".to_string(),
        end_height: "1000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    // When start == end, progress is 0.0 (division by zero protection)
    assert_eq!(epoch.epoch_progress("1000"), 0.0);
}

#[test]
fn test_epoch_info_deserialization_all_strings() {
    let data = serde_json::json!({
        "index": "10",
        "startHeight": "5000",
        "endHeight": "6000",
        "firstBlockHeight": "5000",
        "firstCoreBlockHeight": "4000",
        "startTime": "1600000000"
    });

    let info: EpochInfo = serde_json::from_value(data).unwrap();

    assert_eq!(info.index, "10");
    assert_eq!(info.start_height, "5000");
    assert_eq!(info.end_height, "6000");
    assert_eq!(info.first_block_height, "5000");
    assert_eq!(info.first_core_block_height, "4000");
    assert_eq!(info.start_time, "1600000000");
}

#[test]
fn test_epoch_info_deserialization_all_numbers() {
    let data = serde_json::json!({
        "index": 10,
        "startHeight": 5000,
        "endHeight": 6000,
        "firstBlockHeight": 5000,
        "firstCoreBlockHeight": 4000,
        "startTime": 1600000000
    });

    let info: EpochInfo = serde_json::from_value(data).unwrap();

    assert_eq!(info.index, "10");
    assert_eq!(info.start_height, "5000");
    assert_eq!(info.end_height, "6000");
}

#[test]
fn test_epoch_info_deserialization_mixed() {
    let data = serde_json::json!({
        "index": "10",
        "startHeight": 5000,
        "endHeight": "6000",
        "firstBlockHeight": 5000,
        "firstCoreBlockHeight": "4000",
        "startTime": 1600000000
    });

    let info: EpochInfo = serde_json::from_value(data).unwrap();

    assert_eq!(info.index, "10");
    assert_eq!(info.start_height, "5000");
    assert_eq!(info.end_height, "6000");
}

#[test]
fn test_epoch_info_reasonable_large_numbers() {
    let epoch = EpochInfo {
        index: "1000000".to_string(),
        start_height: "1000000000000".to_string(),  // 1 trillion
        end_height: "1000000001000".to_string(),    // 1 trillion + 1000
        first_block_height: "1000000000000".to_string(),
        first_core_block_height: "999999999999".to_string(),
        start_time: "9999999999".to_string(),
    };

    // Test with reasonable values that fit in u128
    assert_eq!(epoch.current_height_within_epoch("1000000000500"), 500);
}

// ==================== DAPIClient Method Tests ====================

#[tokio::test]
async fn test_get_platform_status_testnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_platform_status(Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_platform_status_mainnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_platform_status(Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_current_epoch_testnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_current_epoch(Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_current_epoch_mainnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_current_epoch(Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_epochs_info_no_params() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_epochs_info(None, None, None, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_epochs_info_with_start_epoch() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_epochs_info(Some("100".to_string()), None, None, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_epochs_info_with_count() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_epochs_info(None, Some(10), None, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_epochs_info_with_ascending() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_epochs_info(None, None, Some(true), Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_epochs_info_all_params() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_epochs_info(
        Some("50".to_string()),
        Some(20),
        Some(false),
        Network::Mainnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_finalized_epoch_infos_no_params() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_finalized_epoch_infos(None, None, None, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_finalized_epoch_infos_all_params() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_finalized_epoch_infos(
        Some("100".to_string()),
        Some(5),
        Some(true),
        Network::Mainnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_total_credits_in_platform_testnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_total_credits_in_platform(Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_total_credits_in_platform_mainnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_total_credits_in_platform(Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_vote_polls_by_end_date_no_params() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_vote_polls_by_end_date(None, None, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_vote_polls_by_end_date_with_end_time() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_vote_polls_by_end_date(
        Some("1700000000000".to_string()),
        None,
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_vote_polls_by_end_date_with_limit() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_vote_polls_by_end_date(None, Some(100), Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_vote_polls_by_end_date_all_params() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_vote_polls_by_end_date(
        Some("1700000000000".to_string()),
        Some(50),
        Network::Mainnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_current_chain_height_testnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_current_chain_height(Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_current_chain_height_mainnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_current_chain_height(Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_formatted_epoch_info_testnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_formatted_epoch_info(Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_formatted_epoch_info_mainnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_formatted_epoch_info(Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_epochs_info_invalid_start_epoch_string() {
    let client = DAPIClient::new("https://localhost".to_string());
    // Invalid number string - should parse to None and send Null
    let res = client.get_epochs_info(
        Some("not_a_number".to_string()),
        None,
        None,
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_finalized_epoch_infos_invalid_start_epoch() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_finalized_epoch_infos(
        Some("invalid".to_string()),
        None,
        None,
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_vote_polls_by_end_date_invalid_end_time() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_vote_polls_by_end_date(
        Some("invalid_time".to_string()),
        None,
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[test]
fn test_epoch_info_serialization() {
    let epoch = EpochInfo {
        index: "42".to_string(),
        start_height: "1000".to_string(),
        end_height: "2000".to_string(),
        first_block_height: "1000".to_string(),
        first_core_block_height: "500".to_string(),
        start_time: "1700000000".to_string(),
    };

    let json = serde_json::to_string(&epoch).unwrap();
    assert!(json.contains("\"index\":\"42\""));
    assert!(json.contains("\"startHeight\":\"1000\""));
    assert!(json.contains("\"endHeight\":\"2000\""));
}

#[test]
fn test_epoch_info_clone() {
    let epoch = EpochInfo {
        index: "1".to_string(),
        start_height: "0".to_string(),
        end_height: "100".to_string(),
        first_block_height: "0".to_string(),
        first_core_block_height: "0".to_string(),
        start_time: "0".to_string(),
    };

    let cloned = epoch.clone();
    assert_eq!(cloned.index, "1");
    assert_eq!(cloned.start_height, "0");
}

#[test]
fn test_epoch_info_debug() {
    let epoch = EpochInfo {
        index: "1".to_string(),
        start_height: "0".to_string(),
        end_height: "100".to_string(),
        first_block_height: "0".to_string(),
        first_core_block_height: "0".to_string(),
        start_time: "0".to_string(),
    };

    let debug_str = format!("{:?}", epoch);
    assert!(debug_str.contains("EpochInfo"));
    assert!(debug_str.contains("index"));
}
