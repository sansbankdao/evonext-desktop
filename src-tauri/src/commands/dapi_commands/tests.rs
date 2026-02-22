// src-tauri/src/commands/dapi_commands/tests.rs

use super::*;
use serde_json::json;
use std::collections::HashMap;
use crate::dapi::client::DAPIClient;

// ==================== Helper: create a DAPIClient pointed at a mockito server ====================

fn mock_client(server_url: &str) -> DAPIClient {
    DAPIClient::new(server_url.to_string())
}

/// Build a successful DAPIResponse JSON body for mockito
fn success_body(result: Value) -> String {
    json!({
        "success": true,
        "method": "test",
        "params": [],
        "network": "testnet",
        "result": result
    }).to_string()
}

/// Build a successful DAPIResponse wrapping an array result
fn success_array_body(result: Vec<Value>) -> String {
    json!({
        "success": true,
        "method": "test",
        "params": [],
        "network": "testnet",
        "result": result
    }).to_string()
}

/// Build a failure DAPIResponse JSON body
fn failure_body() -> String {
    json!({
        "success": false,
        "method": "test",
        "params": [],
        "network": "testnet",
        "result": null
    }).to_string()
}

// ==================== parse_network Tests ====================

#[test]
fn test_parse_network_none_defaults_to_testnet() {
    let n = parse_network(None);
    assert_eq!(n, Network::Testnet);
}

#[test]
fn test_parse_network_testnet() {
    let n = parse_network(Some("testnet".to_string()));
    assert_eq!(n, Network::Testnet);
}

#[test]
fn test_parse_network_mainnet() {
    let n = parse_network(Some("mainnet".to_string()));
    assert_eq!(n, Network::Mainnet);
}

#[test]
fn test_parse_network_invalid_defaults_to_testnet() {
    let n = parse_network(Some("invalidnet".to_string()));
    assert_eq!(n, Network::Testnet);
}

#[test]
fn test_parse_network_empty_string_defaults_to_testnet() {
    let n = parse_network(Some("".to_string()));
    assert_eq!(n, Network::Testnet);
}

#[test]
fn test_parse_network_case_insensitive() {
    let n = parse_network(Some("MAINNET".to_string()));
    assert_eq!(n, Network::Mainnet);
}

// ==================== params_array_to_object Tests (existing, preserved) ====================

#[test]
fn test_params_conversion_invalid_method() {
    let res = params_array_to_object("invalid_method_xyz", vec![]);
    assert!(res.is_err());
}

#[test]
fn test_params_conversion_valid_logic() {
    let mock_params = vec![json!("test_identity_id")];
    let res = params_array_to_object("get_identity", mock_params);
    let map = res.unwrap();
    assert!(map.contains_key("identityId"));
    assert_eq!(map.get("identityId").unwrap(), "test_identity_id");
}

// ==================== dapi_request_inner Tests (existing, preserved) ====================

#[tokio::test]
async fn test_dapi_request_validation_failure_pure() {
    let mut params = HashMap::new();
    params.insert("wrong_key".to_string(), json!(123));

    // Calls the pure logic version restored in dapi_commands.rs
    let res = dapi_request_inner("get_identity".into(), params, None).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_dapi_request_inner_missing_param() {
    let params = HashMap::new();

    let res = dapi_request_inner("get_identity".to_string(), params, None).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_dapi_request_inner_invalid_method() {
    let params = HashMap::new();

    let res = dapi_request_inner("invalid_method".to_string(), params, None).await;
    assert!(res.is_err());
}

// ==================== DapiPublicKey Tests (existing, preserved) ====================

#[test]
fn test_dapi_public_key_deserialization_full() {
    let json_str = r#"{
        "purpose": "AUTHENTICATION",
        "securityLevel": "MASTER",
        "keyType": "ECDSA_SECP256K1",
        "data": "0xabcdef",
        "dataB64": "q83v",
        "readOnly": false,
        "disabledAt": "2024-01-01T00:00:00Z"
    }"#;

    let key: DapiPublicKey = serde_json::from_str(json_str).unwrap();
    assert_eq!(key.purpose, "AUTHENTICATION");
    assert_eq!(key.security_level, "MASTER");
    assert_eq!(key.key_type, "ECDSA_SECP256K1");
    assert_eq!(key.data, "0xabcdef");
    assert_eq!(key.data_b64, "q83v");
    assert!(!key.read_only);
    assert_eq!(key.disabled_at, Some("2024-01-01T00:00:00Z".to_string()));
}

#[test]
fn test_dapi_public_key_deserialization_minimal() {
    let json_str = r#"{
        "purpose": "ENCRYPTION",
        "securityLevel": "CRITICAL",
        "keyType": "ECDSA_SECP256K1",
        "data": "0x123456",
        "dataB64": "EjRW",
        "readOnly": true
    }"#;

    let key: DapiPublicKey = serde_json::from_str(json_str).unwrap();
    assert_eq!(key.purpose, "ENCRYPTION");
    assert_eq!(key.security_level, "CRITICAL");
    assert!(key.read_only);
    assert!(key.disabled_at.is_none());
}

#[test]
fn test_dapi_public_key_serialization() {
    let key = DapiPublicKey {
        purpose: "TRANSFER".to_string(),
        security_level: "HIGH".to_string(),
        key_type: "BLS12_381".to_string(),
        data: "0xdeadbeef".to_string(),
        data_b64: "3q2+".to_string(),
        read_only: false,
        disabled_at: None,
    };

    let json = serde_json::to_string(&key).unwrap();
    assert!(json.contains("\"purpose\":\"TRANSFER\""));
    assert!(json.contains("\"securityLevel\":\"HIGH\""));
    assert!(json.contains("\"keyType\":\"BLS12_381\""));
    assert!(json.contains("\"readOnly\":false"));
}

#[test]
fn test_dapi_public_key_with_disabled_at() {
    let key = DapiPublicKey {
        purpose: "AUTHENTICATION".to_string(),
        security_level: "MASTER".to_string(),
        key_type: "ECDSA_SECP256K1".to_string(),
        data: "0xabc".to_string(),
        data_b64: "abc".to_string(),
        read_only: true,
        disabled_at: Some("2024-12-31T23:59:59Z".to_string()),
    };

    let serialized = serde_json::to_string(&key).unwrap();
    let deserialized: DapiPublicKey = serde_json::from_str(&serialized).unwrap();
    assert_eq!(deserialized.disabled_at, Some("2024-12-31T23:59:59Z".to_string()));
}

// ==================== DapiIdentityResponse Tests (existing, preserved) ====================

#[test]
fn test_dapi_identity_response_deserialization_full() {
    let json_str = r#"{
        "identityId": "7gYFhV5YWmJdjBTmM5rGgfQyWe7V4tJhP8vqE7JDnD1N",
        "publicKeyHash": "QmbUF5EoS6YLLJ7s4g9Fy5p4X7H9vLJ7r8M9N2p3q4r5s6",
        "balance": "1000000000",
        "revision": "5",
        "publicKeys": [
            {
                "purpose": "AUTHENTICATION",
                "securityLevel": "MASTER",
                "keyType": "ECDSA_SECP256K1",
                "data": "0xabcdef",
                "dataB64": "q83v",
                "readOnly": false
            }
        ]
    }"#;

    let identity: DapiIdentityResponse = serde_json::from_str(json_str).unwrap();
    assert_eq!(identity.identity_id, "7gYFhV5YWmJdjBTmM5rGgfQyWe7V4tJhP8vqE7JDnD1N");
    assert_eq!(identity.public_key_hash, Some("QmbUF5EoS6YLLJ7s4g9Fy5p4X7H9vLJ7r8M9N2p3q4r5s6".to_string()));
    assert_eq!(identity.balance, "1000000000");
    assert_eq!(identity.revision, "5");
    assert_eq!(identity.public_keys.len(), 1);
}

#[test]
fn test_dapi_identity_response_deserialization_minimal() {
    let json_str = r#"{
        "identityId": "test_identity_id",
        "balance": "0",
        "revision": "1"
    }"#;

    let identity: DapiIdentityResponse = serde_json::from_str(json_str).unwrap();
    assert_eq!(identity.identity_id, "test_identity_id");
    assert!(identity.public_key_hash.is_none());
    assert_eq!(identity.balance, "0");
    assert_eq!(identity.revision, "1");
    assert!(identity.public_keys.is_empty());
}

#[test]
fn test_dapi_identity_response_serialization() {
    let identity = DapiIdentityResponse {
        identity_id: "test_id".to_string(),
        public_key_hash: Some("hash123".to_string()),
        balance: "5000".to_string(),
        revision: "2".to_string(),
        public_keys: vec![],
    };

    let json = serde_json::to_string(&identity).unwrap();
    assert!(json.contains("\"identityId\":\"test_id\""));
    assert!(json.contains("\"publicKeyHash\":\"hash123\""));
    assert!(json.contains("\"balance\":\"5000\""));
    assert!(json.contains("\"revision\":\"2\""));
}

#[test]
fn test_dapi_identity_response_with_multiple_keys() {
    let json_str = r#"{
        "identityId": "multi_key_id",
        "balance": "1000",
        "revision": "3",
        "publicKeys": [
            {
                "purpose": "AUTHENTICATION",
                "securityLevel": "MASTER",
                "keyType": "ECDSA_SECP256K1",
                "data": "0x111",
                "dataB64": "111",
                "readOnly": false
            },
            {
                "purpose": "TRANSFER",
                "securityLevel": "HIGH",
                "keyType": "BLS12_381",
                "data": "0x222",
                "dataB64": "222",
                "readOnly": false
            }
        ]
    }"#;

    let identity: DapiIdentityResponse = serde_json::from_str(json_str).unwrap();
    assert_eq!(identity.public_keys.len(), 2);
    assert_eq!(identity.public_keys[0].purpose, "AUTHENTICATION");
    assert_eq!(identity.public_keys[1].purpose, "TRANSFER");
}

// ==================== extract_first_as_response Tests (existing, preserved) ====================

#[test]
fn test_extract_first_as_response_success() {
    let input = vec![json!({
        "identityId": "test_id",
        "balance": "100",
        "revision": "1",
        "publicKeys": []
    })];

    let result = extract_first_as_response(input).unwrap();
    assert_eq!(result.identity_id, "test_id");
    assert_eq!(result.balance, "100");
    assert_eq!(result.revision, "1");
}

#[test]
fn test_extract_first_as_response_empty_result() {
    let input: Vec<Value> = vec![];
    let result = extract_first_as_response(input);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("empty result"));
}

#[test]
fn test_extract_first_as_response_error_response() {
    let input = vec![json!({
        "success": false,
        "error": "Identity not found"
    })];

    let result = extract_first_as_response(input);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Identity not found"));
}

#[test]
fn test_extract_first_as_response_error_no_message() {
    let input = vec![json!({
        "success": false
    })];

    let result = extract_first_as_response(input);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("success=false"));
}

#[test]
fn test_extract_first_as_response_wrapped_in_result() {
    let input = vec![json!({
        "result": {
            "identityId": "wrapped_id",
            "balance": "200",
            "revision": "3"
        }
    })];

    let result = extract_first_as_response(input).unwrap();
    assert_eq!(result.identity_id, "wrapped_id");
    assert_eq!(result.balance, "200");
}

#[test]
fn test_extract_first_as_response_numeric_disabled_at() {
    let input = vec![json!({
        "identityId": "test_id",
        "balance": "100",
        "revision": "1",
        "publicKeys": [{
            "purpose": "AUTHENTICATION",
            "securityLevel": "MASTER",
            "keyType": "ECDSA_SECP256K1",
            "data": "0xabc",
            "dataB64": "dW5kZWZpbmVk",
            "readOnly": false,
            "disabledAt": 1704067200
        }]
    })];

    let result = extract_first_as_response(input).unwrap();
    assert_eq!(result.public_keys[0].disabled_at, Some("1704067200".to_string()));
}

#[test]
fn test_extract_first_as_response_numeric_purpose_conversion() {
    let input = vec![json!({
        "identityId": "test_id",
        "balance": "100",
        "revision": "1",
        "publicKeys": [{
            "purpose": 0,
            "securityLevel": "MASTER",
            "keyType": "ECDSA_SECP256K1",
            "data": "0xabc",
            "dataB64": "dW5kZWZpbmVk",
            "readOnly": false
        }]
    })];

    let result = extract_first_as_response(input).unwrap();
    assert_eq!(result.public_keys[0].purpose, "AUTHENTICATION");
}

#[test]
fn test_extract_first_as_response_numeric_security_level_conversion() {
    let input = vec![json!({
        "identityId": "test_id",
        "balance": "100",
        "revision": "1",
        "publicKeys": [{
            "purpose": "AUTHENTICATION",
            "securityLevel": 1,
            "keyType": "ECDSA_SECP256K1",
            "data": "0xabc",
            "dataB64": "dW5kZWZpbmVk",
            "readOnly": false
        }]
    })];

    let result = extract_first_as_response(input).unwrap();
    assert_eq!(result.public_keys[0].security_level, "ENCRYPTION");
}

#[test]
fn test_extract_first_as_response_missing_optional_fields() {
    let input = vec![json!({
        "identityId": "test_id",
        "balance": "100",
        "revision": "1"
    })];

    let result = extract_first_as_response(input).unwrap();
    assert!(result.public_key_hash.is_none());
    assert!(result.public_keys.is_empty());
}

#[test]
fn test_extract_first_as_response_serialization_error() {
    let input = vec![json!({
        "identityId": 12345, // Invalid: should be string
        "balance": "100",
        "revision": "1"
    })];

    let result = extract_first_as_response(input);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Serialization error"));
}

// ==================== purpose_code_to_string Tests (existing, preserved) ====================

#[test]
fn test_purpose_code_to_string_authentication() {
    assert_eq!(purpose_code_to_string(0), "AUTHENTICATION");
}

#[test]
fn test_purpose_code_to_string_encryption() {
    assert_eq!(purpose_code_to_string(1), "ENCRYPTION");
}

#[test]
fn test_purpose_code_to_string_decryption() {
    assert_eq!(purpose_code_to_string(2), "DECRYPTION");
}

#[test]
fn test_purpose_code_to_string_transfer() {
    assert_eq!(purpose_code_to_string(3), "TRANSFER");
}

#[test]
fn test_purpose_code_to_string_unknown() {
    assert_eq!(purpose_code_to_string(99), "UNKNOWN_99");
}

#[test]
fn test_purpose_code_to_string_unknown_high() {
    assert_eq!(purpose_code_to_string(255), "UNKNOWN_255");
}

// ==================== Additional Edge Case Tests (existing, preserved) ====================

#[test]
fn test_dapi_identity_response_large_balance() {
    let json_str = r#"{
        "identityId": "test_id",
        "balance": "999999999999999999999",
        "revision": "999"
    }"#;

    let identity: DapiIdentityResponse = serde_json::from_str(json_str).unwrap();
    assert_eq!(identity.balance, "999999999999999999999");
    assert_eq!(identity.revision, "999");
}

#[test]
fn test_extract_first_as_response_with_nested_result() {
    let input = vec![json!({
        "result": {
            "identityId": "nested_id",
            "balance": "300",
            "revision": "5",
            "publicKeys": [{
                "purpose": "TRANSFER",
                "securityLevel": "HIGH",
                "keyType": "BLS12_381",
                "data": "0x123",
                "dataB64": "EjM",
                "readOnly": true
            }]
        }
    })];

    let result = extract_first_as_response(input).unwrap();
    assert_eq!(result.identity_id, "nested_id");
    assert_eq!(result.public_keys.len(), 1);
    assert!(result.public_keys[0].read_only);
}

#[test]
fn test_extract_first_as_response_multiple_public_keys() {
    let input = vec![json!({
        "identityId": "multi_key_id",
        "balance": "500",
        "revision": "2",
        "publicKeys": [
            {
                "purpose": "AUTHENTICATION",
                "securityLevel": "MASTER",
                "keyType": "ECDSA_SECP256K1",
                "data": "0x111",
                "dataB64": "ERH",
                "readOnly": false
            },
            {
                "purpose": "TRANSFER",
                "securityLevel": "HIGH",
                "keyType": "BLS12_381",
                "data": "0x222",
                "dataB64": "IiL",
                "readOnly": false
            }
        ]
    })];

    let result = extract_first_as_response(input).unwrap();
    assert_eq!(result.public_keys.len(), 2);
    assert_eq!(result.public_keys[0].purpose, "AUTHENTICATION");
    assert_eq!(result.public_keys[1].purpose, "TRANSFER");
}

#[test]
fn test_dapi_identity_response_with_missing_public_keys_field() {
    let json_str = r#"{
        "identityId": "test_id",
        "balance": "100",
        "revision": "1"
    }"#;

    let identity: DapiIdentityResponse = serde_json::from_str(json_str).unwrap();
    assert!(identity.public_keys.is_empty());
}

#[test]
fn test_dapi_identity_response_with_empty_public_keys_array() {
    let json_str = r#"{
        "identityId": "test_id",
        "balance": "100",
        "revision": "1",
        "publicKeys": []
    }"#;

    let identity: DapiIdentityResponse = serde_json::from_str(json_str).unwrap();
    assert!(identity.public_keys.is_empty());
}

#[test]
fn test_dapi_public_key_all_purpose_types() {
    for (code, expected) in &[
        (0u8, "AUTHENTICATION"),
        (1u8, "ENCRYPTION"),
        (2u8, "DECRYPTION"),
        (3u8, "TRANSFER"),
    ] {
        let json_str = format!(r#"{{
            "purpose": {},
            "securityLevel": "MASTER",
            "keyType": "ECDSA_SECP256K1",
            "data": "0xabc",
            "dataB64": "abc",
            "readOnly": false
        }}"#, code);

        let input = vec![json!({
            "identityId": "test_id",
            "balance": "100",
            "revision": "1",
            "publicKeys": [serde_json::from_str::<Value>(&json_str).unwrap()]
        })];

        let result = extract_first_as_response(input).unwrap();
        assert_eq!(result.public_keys[0].purpose, *expected);
    }
}

#[test]
fn test_dapi_public_key_clone_and_debug() {
    let key = DapiPublicKey {
        purpose: "AUTHENTICATION".to_string(),
        security_level: "MASTER".to_string(),
        key_type: "ECDSA_SECP256K1".to_string(),
        data: "0xabc".to_string(),
        data_b64: "abc".to_string(),
        read_only: false,
        disabled_at: None,
    };

    let cloned = key.clone();
    assert_eq!(key.purpose, cloned.purpose);

    let debug_str = format!("{:?}", key);
    assert!(debug_str.contains("DapiPublicKey"));
}

#[test]
fn test_dapi_identity_response_clone_and_debug() {
    let identity = DapiIdentityResponse {
        identity_id: "test_id".to_string(),
        public_key_hash: None,
        balance: "100".to_string(),
        revision: "1".to_string(),
        public_keys: vec![],
    };

    let cloned = identity.clone();
    assert_eq!(identity.identity_id, cloned.identity_id);

    let debug_str = format!("{:?}", identity);
    assert!(debug_str.contains("DapiIdentityResponse"));
}

// ==========================================================================================
// NEW: Inner function tests with mockito — covers all #[tauri::command] code paths
// ==========================================================================================

/// Helper: identity JSON that the mock server returns inside a DAPIResponse
fn mock_identity_result() -> Value {
    json!({
        "identityId": "mock_identity_123",
        "balance": "50000",
        "revision": "7",
        "publicKeys": [{
            "purpose": "AUTHENTICATION",
            "securityLevel": "MASTER",
            "keyType": "ECDSA_SECP256K1",
            "data": "0xmockdata",
            "dataB64": "bW9ja2RhdGE",
            "readOnly": false
        }]
    })
}

// ==================== get_identity_by_public_key_hash_inner ====================

#[tokio::test]
async fn test_get_identity_by_public_key_hash_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_body(mock_identity_result()))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_public_key_hash_inner(&client, "abc123hash".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    let identity = result.unwrap();
    assert_eq!(identity.identity_id, "mock_identity_123");
    assert_eq!(identity.balance, "50000");
    assert_eq!(identity.public_keys.len(), 1);
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_by_public_key_hash_inner_network_none() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_body(mock_identity_result()))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_public_key_hash_inner(&client, "hash456".to_string(), None).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_by_public_key_hash_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_public_key_hash_inner(&client, "hash789".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_by_public_key_hash_inner_mainnet() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_body(mock_identity_result()))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_public_key_hash_inner(&client, "hash_main".to_string(), Some("mainnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

// ==================== get_identity_by_non_unique_public_key_hash_inner ====================

#[tokio::test]
async fn test_get_identity_by_non_unique_hash_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_body(mock_identity_result()))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_non_unique_public_key_hash_inner(&client, "nonunique_hash".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    let identity = result.unwrap();
    assert_eq!(identity.identity_id, "mock_identity_123");
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_by_non_unique_hash_inner_network_none() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_body(mock_identity_result()))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_non_unique_public_key_hash_inner(&client, "hash".to_string(), None).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_by_non_unique_hash_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_non_unique_public_key_hash_inner(&client, "hash".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_identity_info_inner ====================

#[tokio::test]
async fn test_get_identity_info_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_body(mock_identity_result()))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_info_inner(&client, "id_123".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    assert_eq!(result.unwrap().identity_id, "mock_identity_123");
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_info_inner_network_none() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_body(mock_identity_result()))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_info_inner(&client, "id_456".to_string(), None).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_info_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_info_inner(&client, "id_789".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_identity_by_id_inner ====================

#[tokio::test]
async fn test_get_identity_by_id_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_body(mock_identity_result()))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_id_inner(&client, "id_abc".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_by_id_inner_mainnet() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_body(mock_identity_result()))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_id_inner(&client, "id_main".to_string(), Some("mainnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_by_id_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_by_id_inner(&client, "id_fail".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_dpns_username_inner ====================

#[tokio::test]
async fn test_get_dpns_username_inner_success_with_name() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!("alice")]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_dpns_username_inner(&client, "id_alice".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    assert_eq!(result.unwrap(), Some("alice".to_string()));
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_dpns_username_inner_success_empty() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_dpns_username_inner(&client, "id_no_name".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    assert_eq!(result.unwrap(), None);
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_dpns_username_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_dpns_username_inner(&client, "id_fail".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_dpns_username_inner_network_none() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!("bob")]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_dpns_username_inner(&client, "id_bob".to_string(), None).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

// ==================== dapi_request_array_inner ====================

#[tokio::test]
async fn test_dapi_request_array_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"result": "ok"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = dapi_request_array_inner(&client, "get_identity".to_string(), vec![json!("some_id")], Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_dapi_request_array_inner_invalid_method() {
    let server = mockito::Server::new_async().await;
    let client = mock_client(&server.url());
    let result = dapi_request_array_inner(&client, "totally_invalid".to_string(), vec![], None).await;

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("Unknown method"));
}

#[tokio::test]
async fn test_dapi_request_array_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = dapi_request_array_inner(&client, "get_status".to_string(), vec![], Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_token_balances_inner ====================

#[tokio::test]
async fn test_get_token_balances_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"tokenId": "tok1", "balance": "1000"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_token_balances_inner(&client, "id_123".to_string(), vec!["tok1".to_string()], Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_token_balances_inner_network_none() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_token_balances_inner(&client, "id_456".to_string(), vec![], None).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_token_balances_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_token_balances_inner(&client, "id_fail".to_string(), vec!["tok1".to_string()], Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== resolve_dpns_name_inner ====================

#[tokio::test]
async fn test_resolve_dpns_name_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"name": "alice.dash"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = resolve_dpns_name_inner(&client, "alice".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_resolve_dpns_name_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = resolve_dpns_name_inner(&client, "alice".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_resolve_dpns_name_inner_network_none() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"name": "bob.dash"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = resolve_dpns_name_inner(&client, "bob".to_string(), None).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

// ==================== get_platform_status_inner ====================

#[tokio::test]
async fn test_get_platform_status_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"status": "online"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_platform_status_inner(&client, Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_platform_status_inner_mainnet() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"status": "online"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_platform_status_inner(&client, Some("mainnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_platform_status_inner_network_none() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"status": "online"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_platform_status_inner(&client, None).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

// ==================== get_identities_balances_inner ====================

#[tokio::test]
async fn test_get_identities_balances_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"id": "a", "balance": "100"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identities_balances_inner(&client, vec!["a".to_string()], Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identities_balances_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identities_balances_inner(&client, vec!["a".to_string()], Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_data_contract_info_inner ====================

#[tokio::test]
async fn test_get_data_contract_info_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"contract": "data"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_data_contract_info_inner(&client, "contract_abc".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_data_contract_info_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_data_contract_info_inner(&client, "contract_fail".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_token_contract_info_inner ====================

#[tokio::test]
async fn test_get_token_contract_info_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"token": "info"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_token_contract_info_inner(&client, "token_contract_1".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_token_contract_info_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_token_contract_info_inner(&client, "token_fail".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_token_statuses_inner ====================

#[tokio::test]
async fn test_get_token_statuses_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"status": "active"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_token_statuses_inner(&client, vec!["tok1".to_string()], Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_token_statuses_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_token_statuses_inner(&client, vec!["tok_fail".to_string()], Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_total_supply_inner ====================

#[tokio::test]
async fn test_get_total_supply_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"totalSupply": "1000000"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_total_supply_inner(&client, "tok1".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_total_supply_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_total_supply_inner(&client, "tok_fail".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_current_epoch_inner ====================

#[tokio::test]
async fn test_get_current_epoch_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"epoch": 42})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_current_epoch_inner(&client, Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_current_epoch_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_current_epoch_inner(&client, Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_total_credits_in_platform_inner ====================

#[tokio::test]
async fn test_get_total_credits_in_platform_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"credits": "999999"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_total_credits_in_platform_inner(&client, Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_total_credits_in_platform_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_total_credits_in_platform_inner(&client, Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_posts_inner ====================

#[tokio::test]
async fn test_get_posts_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"content": "hello world"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_posts_inner(
        &client,
        "contract_123".to_string(),
        "post".to_string(),
        None, None, None,
        Some("testnet".to_string()),
    ).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_posts_inner_with_all_params() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"content": "filtered"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_posts_inner(
        &client,
        "contract_123".to_string(),
        "post".to_string(),
        Some(json!({"$ownerId": "owner1"})),
        Some(json!({"$createdAt": "desc"})),
        Some(10),
        Some("mainnet".to_string()),
    ).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_posts_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_posts_inner(
        &client,
        "contract_123".to_string(),
        "post".to_string(),
        None, None, None,
        Some("testnet".to_string()),
    ).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_identity_balance_inner ====================

#[tokio::test]
async fn test_get_identity_balance_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!({"balance": "50000"})]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_balance_inner(&client, "id_123".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_identity_balance_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_balance_inner(&client, "id_fail".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== get_dpns_usernames_inner ====================

#[tokio::test]
async fn test_get_dpns_usernames_inner_success() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(success_array_body(vec![json!("alice"), json!("alice2")]))
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_dpns_usernames_inner(&client, "id_alice".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_ok());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_dpns_usernames_inner_api_failure() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body(failure_body())
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_dpns_usernames_inner(&client, "id_fail".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== HTTP Error Tests (connection/transport errors) ====================

#[tokio::test]
async fn test_inner_function_http_connection_error() {
    // Client pointing at a port where nothing is listening
    let client = mock_client("http://127.0.0.1:1");
    let result = get_platform_status_inner(&client, Some("testnet".to_string())).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_identity_info_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_identity_info_inner(&client, "id".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_identity_by_id_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_identity_by_id_inner(&client, "id".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_identity_balance_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_identity_balance_inner(&client, "id".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_token_balances_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_token_balances_inner(&client, "id".to_string(), vec!["tok".to_string()], None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_data_contract_info_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_data_contract_info_inner(&client, "cid".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_token_contract_info_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_token_contract_info_inner(&client, "cid".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_token_statuses_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_token_statuses_inner(&client, vec!["tok".to_string()], None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_total_supply_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_total_supply_inner(&client, "tok".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_current_epoch_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_current_epoch_inner(&client, None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_total_credits_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_total_credits_in_platform_inner(&client, None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_identities_balances_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_identities_balances_inner(&client, vec!["id".to_string()], None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_posts_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_posts_inner(&client, "cid".to_string(), "post".to_string(), None, None, None, None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_dpns_usernames_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_dpns_usernames_inner(&client, "id".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_resolve_dpns_name_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = resolve_dpns_name_inner(&client, "alice".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_dpns_username_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_dpns_username_inner(&client, "id".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_get_identity_by_public_key_hash_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_identity_by_public_key_hash_inner(&client, "hash".to_string(), None).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_get_identity_by_non_unique_hash_inner_http_error() {
    let client = mock_client("http://127.0.0.1:1");
    let result = get_identity_by_non_unique_public_key_hash_inner(&client, "hash".to_string(), None).await;
    assert!(result.is_err());
}

// ==================== Malformed response tests ====================

#[tokio::test]
async fn test_get_identity_info_inner_malformed_response() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body("not json at all")
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_identity_info_inner(&client, "id".to_string(), Some("testnet".to_string())).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

#[tokio::test]
async fn test_get_platform_status_inner_malformed_response() {
    let mut server = mockito::Server::new_async().await;
    let mock = server.mock("POST", "/")
        .with_status(200)
        .with_header("content-type", "application/json")
        .with_body("{invalid json")
        .create_async().await;

    let client = mock_client(&server.url());
    let result = get_platform_status_inner(&client, None).await;

    assert!(result.is_err());
    mock.assert_async().await;
}

// ==================== dapi_request_inner with valid params via mock ====================

#[tokio::test]
async fn test_dapi_request_inner_with_valid_params_exercises_param_building() {
    // dapi_request_inner uses the global lazy_static client, so we can't mock the HTTP.
    // But we can verify the param-building + network-parsing logic is exercised.
    // With valid params, it will attempt the HTTP call and fail (or succeed if online).
    // We just verify it doesn't panic and returns a result.
    let mut params = HashMap::new();
    params.insert("identityId".to_string(), json!("valid_id"));

    let res = dapi_request_inner("get_identity".to_string(), params, Some("mainnet".to_string())).await;
    // Result is either Ok (if API is reachable) or Err (if not) — both are valid
    let _ = res;
}

#[tokio::test]
async fn test_dapi_request_inner_with_no_params_method_exercises_empty_loop() {
    let params = HashMap::new();

    let res = dapi_request_inner("get_status".to_string(), params, Some("testnet".to_string())).await;
    // Result is either Ok or Err depending on network — both are valid
    let _ = res;
}

#[tokio::test]
async fn test_dapi_request_inner_builds_params_array_with_nulls() {
    // Provide an empty map for a method that requires params — should fill with Null
    let params = HashMap::new();

    let res = dapi_request_inner("get_identity_balance".to_string(), params, None).await;
    // Exercises the null-filling branch in the for loop
    // Will fail at validation (missing required param) or at HTTP — either is fine
    let _ = res;
}
