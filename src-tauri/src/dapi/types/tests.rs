// src-tauri/src/dapi/types/tests.rs

use super::*;
use serde_json::json;

#[test]
fn test_network_parsing() {
    assert_eq!(Network::from_str("Mainnet"), Some(Network::Mainnet));
    assert_eq!(Network::from_str("testnet"), Some(Network::Testnet));
    assert_eq!(Network::from_str("invalid"), None);
}

#[test]
fn test_dapi_response_conversion() {
    let resp = DAPIResponse {
        success: true,
        method: "test".into(),
        params: vec![],
        network: "testnet".into(),
        // FIXED: Using snake_case keys to match standard Rust struct fields
        result: json!([{
            "contract_id": "123",
            "owner_id": "oa",
            "name": "N",
            "symbol": "S",
            "total_supply": 100,
            "decimals": 8
        }]),
    };

    // Attempt conversion
    let result_res: Result<Vec<TokenContractInfo>, _> = resp.into_result();

    match result_res {
        Ok(result) => {
            assert_eq!(result.len(), 1);
            assert_eq!(result[0].contract_id, "123");
        },
        Err(e) => {
            // If it still fails, print the error to see exactly what Serde wanted
            panic!("Deserialization failed: {:?}", e);
        }
    }
}

#[test]
fn test_dapi_error_display() {
    let err = DAPIError::UnknownMethod("foo".into());
    assert_eq!(format!("{}", err), "Unknown method: foo");
}
