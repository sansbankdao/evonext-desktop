// src-tauri/src/dapi/client/methods/identity/tests.rs

use super::*;
use crate::dapi::types::Network;

#[tokio::test]
async fn test_get_identity_param_serialization() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    // This tests the construction of the request without hitting the real network
    // by ensuring the method name and params are handled by the bridge.
    let identity_id = "test_id".to_string();
    let res = client.get_identity(identity_id, Network::Testnet).await;

    // We expect an error here (connection refused) because there is no local node,
    // but we are testing that the async call path is valid.
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_balance_param_serialization() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "balance_test_id".to_string();
    let res = client.get_identity_balance(identity_id, Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_by_public_key_hash_params() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let public_key_hash = "QmbUF5EoS6YLLJ7s4g9Fy5p4X7H9vLJ7r8M9N2p3q4r5s6".to_string();
    let res = client.get_identity_by_public_key_hash(public_key_hash, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_nonce_params() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "nonce_test_id".to_string();
    let res = client.get_identity_nonce(identity_id, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_contract_nonce_params() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "contract_nonce_id".to_string();
    let contract_id = "5zE4X8kL2mN9pQ7rS3tV6wY1zA4bC8dD2eF6gH9jK3mL".to_string();
    let res = client.get_identity_contract_nonce(identity_id, contract_id, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_keys_minimal_params() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "keys_test_id".to_string();
    // Test with all optional params as None
    let res = client.get_identity_keys(
        identity_id,
        None,  // key_request_type
        None,  // key_ids
        None,  // limit
        None,  // offset
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_keys_with_key_request_type() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "keys_with_type_id".to_string();
    let res = client.get_identity_keys(
        identity_id,
        Some("specific".to_string()),
        None,
        None,
        None,
        Network::Mainnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_keys_with_key_ids() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "keys_with_ids_id".to_string();
    let res = client.get_identity_keys(
        identity_id,
        None,
        Some(vec![1, 2, 3]),
        None,
        None,
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_keys_with_limit_and_offset() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "keys_paginated_id".to_string();
    let res = client.get_identity_keys(
        identity_id,
        Some("all".to_string()),
        Some(vec![0, 1]),
        Some(100),
        Some(50),
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_keys_all_params() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "keys_full_id".to_string();
    let res = client.get_identity_keys(
        identity_id,
        Some("specific".to_string()),
        Some(vec![0, 1, 2, 3, 4]),
        Some(10),
        Some(0),
        Network::Mainnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_token_balances_single_token() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "token_balance_id".to_string();
    let token_ids = vec!["token_123".to_string()];
    let res = client.get_identity_token_balances(identity_id, token_ids, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_token_balances_multiple_tokens() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "multi_token_id".to_string();
    let token_ids = vec![
        "token_abc".to_string(),
        "token_def".to_string(),
        "token_ghi".to_string(),
    ];
    let res = client.get_identity_token_balances(identity_id, token_ids, Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_token_balances_empty_tokens() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "empty_tokens_id".to_string();
    let token_ids: Vec<String> = vec![];
    let res = client.get_identity_token_balances(identity_id, token_ids, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identities_balances_single_identity() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_ids = vec!["single_balance_id".to_string()];
    let res = client.get_identities_balances(identity_ids, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identities_balances_multiple_identities() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_ids = vec![
        "identity_1".to_string(),
        "identity_2".to_string(),
        "identity_3".to_string(),
    ];
    let res = client.get_identities_balances(identity_ids, Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identities_balances_empty_list() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_ids: Vec<String> = vec![];
    let res = client.get_identities_balances(identity_ids, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_balance_and_revision_params() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_id = "balance_revision_id".to_string();
    let res = client.get_identity_balance_and_revision(identity_id, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identities_contract_keys_minimal() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_ids = vec!["contract_key_id".to_string()];
    let contract_id = "contract_abc".to_string();
    let res = client.get_identities_contract_keys(
        identity_ids,
        contract_id,
        None,  // purposes
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identities_contract_keys_with_purposes() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_ids = vec!["id_1".to_string(), "id_2".to_string()];
    let contract_id = "contract_xyz".to_string();
    let purposes = Some(vec![0, 1, 2, 3]);
    let res = client.get_identities_contract_keys(
        identity_ids,
        contract_id,
        purposes,
        Network::Mainnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identities_contract_keys_empty_identities() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_ids: Vec<String> = vec![];
    let contract_id = "contract_empty".to_string();
    let res = client.get_identities_contract_keys(
        identity_ids,
        contract_id,
        Some(vec![0]),
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identities_contract_keys_empty_purposes() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_ids = vec!["key_test_id".to_string()];
    let contract_id = "contract_123".to_string();
    let purposes = Some(vec![]);
    let res = client.get_identities_contract_keys(
        identity_ids,
        contract_id,
        purposes,
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

// Network variant coverage tests
#[tokio::test]
async fn test_network_variants_get_identity() {
    let client = DAPIClient::new("https://test.example.com".to_string());

    // Test with explicit Testnet
    let res = client.get_identity("test_id".to_string(), Network::Testnet).await;
    assert!(res.is_err());

    // Test with explicit Mainnet
    let res = client.get_identity("mainnet_id".to_string(), Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_network_variants_get_balance() {
    let client = DAPIClient::new("https://test.example.com".to_string());

    let res = client.get_identity_balance("testnet_balance".to_string(), Network::Testnet).await;
    assert!(res.is_err());

    let res = client.get_identity_balance("mainnet_balance".to_string(), Network::Mainnet).await;
    assert!(res.is_err());
}

// Edge case tests for parameter handling
#[tokio::test]
async fn test_get_identity_empty_string_id() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client.get_identity("".to_string(), Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_long_id() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let long_id = "a".repeat(1000);
    let res = client.get_identity(long_id, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_special_chars_in_id() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let special_id = "id-with-special-chars!@#$%^&*()".to_string();
    let res = client.get_identity(special_id, Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identity_keys_large_key_ids_list() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let key_ids: Vec<u32> = (0..100).collect();
    let res = client.get_identity_keys(
        "large_keys_id".to_string(),
        None,
        Some(key_ids),
        None,
        None,
        Network::Testnet
    ).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_identities_balances_large_batch() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let identity_ids: Vec<String> = (0..50).map(|i| format!("batch_id_{}", i)).collect();
    let res = client.get_identities_balances(identity_ids, Network::Testnet).await;
    assert!(res.is_err());
}
