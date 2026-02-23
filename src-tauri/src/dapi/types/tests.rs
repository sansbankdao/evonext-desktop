// src-tauri/src/dapi/types/tests.rs

use super::*;
use serde_json::json;

#[test]
fn test_network_parsing() {
    assert_eq!(Network::parse("Mainnet"), Some(Network::Mainnet));
    assert_eq!(Network::parse("testnet"), Some(Network::Testnet));
    assert_eq!(Network::parse("invalid"), None);
}

#[test]
fn test_dapi_response_conversion() {
    let resp = DAPIResponse {
        success: true,
        method: "test".into(),
        params: vec![],
        network: "testnet".into(),
        // Fixed: Ensure total_supply is a string as expected by TokenContractInfo
        result: json!([{
            "contractId": "123",
            "ownerId": "oa",
            "name": "N",
            "symbol": "S",
            "totalSupply": "100",
            "decimals": 8
        }]),
    };

    let result_res: Result<Vec<TokenContractInfo>, _> = resp.into_result();

    match result_res {
        Ok(result) => {
            assert_eq!(result.len(), 1);
            assert_eq!(result[0].contract_id, "123");
        }
        Err(e) => {
            panic!("Deserialization failed: {:?}", e);
        }
    }
}

#[test]
fn test_dapi_error_display() {
    let err = DAPIError::UnknownMethod("foo".into());
    assert_eq!(format!("{}", err), "Unknown method: foo");
}
