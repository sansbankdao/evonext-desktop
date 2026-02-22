// src-tauri/src/dapi/client/base/tests.rs

use super::*;
use serde_json::json;

#[test]
fn test_dual_parsing_case_a_wrapped() {
    let client = DAPIClient::new("".into());
    let wrapped_json = json!({
        "success": true,
        "method": "getIdentity",
        "params": [],
        "network": "testnet",
        "result": ["identity_data"]
    })
    .to_string();

    let res: Vec<String> = client
        .parse_response_text("getIdentity", &wrapped_json)
        .unwrap();
    assert_eq!(res[0], "identity_data");
}

#[test]
fn test_dual_parsing_case_b_raw_array() {
    let client = DAPIClient::new("".into());
    let raw_json = json!(["raw_data_1", "raw_data_2"]).to_string();

    let res: Vec<String> = client.parse_response_text("method", &raw_json).unwrap();
    assert_eq!(res.len(), 2);
    assert_eq!(res[0], "raw_data_1");
}

#[test]
fn test_dual_parsing_case_c_serialization_error() {
    let client = DAPIClient::new("".into());
    let res: Result<Vec<String>, DAPIError> = client.parse_response_text("method", "invalid_json");
    assert!(matches!(res, Err(DAPIError::SerializationError(_))));
}
