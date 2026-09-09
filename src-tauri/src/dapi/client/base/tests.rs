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

#[test]
fn test_dual_parsing_api_failed() {
    let client = DAPIClient::new("".into());
    let failed_json = json!({
        "success": false,
        "method": "getIdentity",
        "params": [],
        "network": "testnet",
        "result": null
    })
    .to_string();

    let res: Result<Vec<String>, DAPIError> =
        client.parse_response_text("getIdentity", &failed_json);
    assert!(matches!(res, Err(DAPIError::APIFailed(_))));
}

#[test]
fn test_dual_parsing_single_item_fallback() {
    let client = DAPIClient::new("".into());
    // A raw string that isn't an array and isn't a DAPIResponse
    let single_json = json!("single_value").to_string();

    let res: Vec<String> = client.parse_response_text("method", &single_json).unwrap();
    assert_eq!(res.len(), 1);
    assert_eq!(res[0], "single_value");
}

#[test]
fn test_dual_parsing_wrapped_with_object_result() {
    let client = DAPIClient::new("".into());
    let wrapped_json = json!({
        "success": true,
        "method": "getStatus",
        "params": [],
        "network": "testnet",
        "result": {"key": "value"}
    })
    .to_string();

    let res: Vec<serde_json::Value> = client
        .parse_response_text("getStatus", &wrapped_json)
        .unwrap();
    assert_eq!(res.len(), 1);
    assert_eq!(res[0]["key"], "value");
}

#[test]
fn test_dual_parsing_empty_array_result() {
    let client = DAPIClient::new("".into());
    let wrapped_json = json!({
        "success": true,
        "method": "test",
        "params": [],
        "network": "testnet",
        "result": []
    })
    .to_string();

    let res: Vec<String> = client.parse_response_text("test", &wrapped_json).unwrap();
    assert!(res.is_empty());
}

#[test]
fn test_shape_params_get_documents_object_omits_nulls() {
    let params = vec![
        json!("contract_id"),
        json!("post"),
        Value::Null,
        json!({ "$createdAt": "desc" }),
        Value::Null,
        Value::Null,
        Value::Null,
    ];
    let shaped = shape_params_for_wire("get_documents", params);
    assert_eq!(
        shaped,
        json!({
            "dataContractId": "contract_id",
            "documentType": "post",
            "orderBy": { "$createdAt": "desc" }
        })
    );
}

#[test]
fn test_shape_params_get_documents_with_where_and_limit() {
    let params = vec![
        json!("contract_id"),
        json!("post"),
        json!({ "$ownerId": "owner" }),
        Value::Null,
        json!(5),
    ];
    let shaped = shape_params_for_wire("get_documents", params);
    assert_eq!(
        shaped,
        json!({
            "dataContractId": "contract_id",
            "documentType": "post",
            "whereClause": { "$ownerId": "owner" },
            "limit": 5
        })
    );
}

#[test]
fn test_shape_params_get_document_object() {
    let params = vec![json!("contract_id"), json!("post"), json!("doc_id")];
    let shaped = shape_params_for_wire("get_document", params);
    assert_eq!(
        shaped,
        json!({
            "dataContractId": "contract_id",
            "documentType": "post",
            "documentId": "doc_id"
        })
    );
}

#[test]
fn test_shape_params_identity_family_stays_positional() {
    let shaped = shape_params_for_wire("identity_fetch", vec![json!("some_id")]);
    assert_eq!(shaped, json!(["some_id"]));
}

#[test]
fn test_shape_params_get_status_stays_empty_array() {
    let shaped = shape_params_for_wire("get_status", vec![]);
    assert_eq!(shaped, json!([]));
}

#[test]
fn test_get_dapi_client_returns_same_instance() {
    let client1 = get_dapi_client();
    let client2 = get_dapi_client();
    // Both should point to the same static instance
    assert_eq!(client1 as *const DAPIClient, client2 as *const DAPIClient);
}
