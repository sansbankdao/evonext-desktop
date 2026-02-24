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

#[test]
fn test_dapi_error_display_all_variants() {
    let errors = vec![
        (
            DAPIError::RequestFailed("timeout".into()),
            "HTTP request failed: timeout",
        ),
        (
            DAPIError::APIFailed("bad request".into()),
            "DAPI request failed: bad request",
        ),
        (
            DAPIError::SerializationError("invalid json".into()),
            "Serialization error: invalid json",
        ),
        (
            DAPIError::DeserializationError("parse fail".into()),
            "Deserialization error: parse fail",
        ),
        (
            DAPIError::MissingParameter("id".into()),
            "Missing parameter: id",
        ),
        (
            DAPIError::InvalidParameterType("id".into(), "string".into(), "number".into()),
            "Invalid parameter type for id: expected string, got number",
        ),
        (DAPIError::NetworkNotSpecified, "Network not specified"),
    ];

    for (err, expected) in errors {
        assert_eq!(format!("{}", err), expected);
    }
}

#[test]
fn test_dapi_response_into_result_null() {
    let resp = DAPIResponse {
        success: true,
        method: "test".into(),
        params: vec![],
        network: "testnet".into(),
        result: json!(null),
    };
    let result: Result<Vec<String>, _> = resp.into_result();
    assert!(result.unwrap().is_empty());
}

#[test]
fn test_dapi_response_into_result_single_object() {
    let resp = DAPIResponse {
        success: true,
        method: "test".into(),
        params: vec![],
        network: "testnet".into(),
        result: json!({
            "contractId": "abc",
            "ownerId": "def",
            "name": "Token",
            "symbol": "TKN",
            "totalSupply": "1000",
            "decimals": 8
        }),
    };
    let result: Result<Vec<TokenContractInfo>, _> = resp.into_result();
    let items = result.unwrap();
    assert_eq!(items.len(), 1);
    assert_eq!(items[0].symbol, "TKN");
}

#[test]
fn test_dapi_response_into_result_unparseable() {
    let resp = DAPIResponse {
        success: true,
        method: "test".into(),
        params: vec![],
        network: "testnet".into(),
        result: json!(12345),
    };
    let result: Result<Vec<TokenContractInfo>, _> = resp.into_result();
    assert!(result.is_err());
}

#[test]
fn test_network_as_str() {
    assert_eq!(Network::Mainnet.as_str(), "mainnet");
    assert_eq!(Network::Testnet.as_str(), "testnet");
}

#[test]
fn test_network_from_str() {
    assert_eq!("mainnet".parse::<Network>(), Ok(Network::Mainnet));
    assert_eq!("testnet".parse::<Network>(), Ok(Network::Testnet));
    assert!("invalid".parse::<Network>().is_err());
}

#[test]
fn test_network_serialize_deserialize() {
    let net = Network::Testnet;
    let json = serde_json::to_string(&net).unwrap();
    let parsed: Network = serde_json::from_str(&json).unwrap();
    assert_eq!(parsed, Network::Testnet);
}

#[test]
fn test_dapi_request_serialization() {
    let req = DAPIRequest {
        method: "getIdentity".into(),
        params: json!(["abc123"]),
        network: Some("testnet".into()),
    };
    let json = serde_json::to_string(&req).unwrap();
    assert!(json.contains("\"method\":\"getIdentity\""));
    assert!(json.contains("testnet"));
}

#[test]
fn test_dapi_response_clone_debug() {
    let resp = DAPIResponse {
        success: true,
        method: "test".into(),
        params: vec![],
        network: "testnet".into(),
        result: json!(null),
    };
    let cloned = resp.clone();
    assert_eq!(cloned.method, "test");
    let debug = format!("{:?}", cloned);
    assert!(debug.contains("DAPIResponse"));
}

#[test]
fn test_identity_public_key_type() {
    let key = IdentityPublicKey {
        id: 0,
        key_type: json!(0),
        purpose: json!("AUTHENTICATION"),
        security_level: json!(0),
        data: "abc".into(),
        read_only: false,
        disabled_at: None,
    };
    let json = serde_json::to_string(&key).unwrap();
    assert!(json.contains("\"type\":0"));
    assert!(json.contains("\"purpose\":\"AUTHENTICATION\""));
}

#[test]
fn test_identity_struct_serialization() {
    let identity = Identity {
        id: "test_id".into(),
        public_keys: vec![],
        balance: Some("1000".into()),
        revision: Some(5),
    };
    let json = serde_json::to_string(&identity).unwrap();
    assert!(json.contains("\"id\":\"test_id\""));
    assert!(json.contains("\"balance\":\"1000\""));
}

#[test]
fn test_token_contract_info_with_metadata() {
    let info = TokenContractInfo {
        contract_id: "c1".into(),
        owner_id: "o1".into(),
        name: "Token".into(),
        symbol: "TKN".into(),
        total_supply: "1000000".into(),
        decimals: 8,
        metadata: Some(json!({"description": "A test token"})),
    };
    let json = serde_json::to_string(&info).unwrap();
    assert!(json.contains("\"metadata\""));
    assert!(json.contains("A test token"));
}
