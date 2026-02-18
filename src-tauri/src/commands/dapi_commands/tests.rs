// src-tauri/src/commands/dapi_commands/tests.rs

use super::*;
use serde_json::json;
use std::collections::HashMap;

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

#[tokio::test]
async fn test_dapi_request_validation_failure_pure() {
    let mut params = HashMap::new();
    params.insert("wrong_key".to_string(), json!(123));

    // Calls the pure logic version restored in dapi_commands.rs
    let res = dapi_request_inner("get_identity".into(), params, None).await;
    assert!(res.is_err());
}

// ==================== DapiPublicKey Tests ====================

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

// ==================== DapiIdentityResponse Tests ====================

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

// ==================== extract_first_as_response Tests ====================

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

// ==================== purpose_code_to_string Tests ====================

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

// ==================== dapi_request_inner Tests ====================

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

// ==================== Additional Edge Case Tests ====================

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
