// src-tauri/src/dapi/client/validation/tests.rs

use super::*;
use serde_json::json;
use std::collections::HashMap;

// ==================== MethodParamInfo::for_method ====================

#[test]
fn test_for_method_get_documents() {
    let info = MethodParamInfo::for_method("get_documents").unwrap();
    assert!(info.required_params.contains(&"dataContractId"));
    assert!(info.required_params.contains(&"documentType"));
    assert!(info.param_types.contains_key("whereClause"));
    assert!(info.param_types.contains_key("orderBy"));
    assert!(info.param_types.contains_key("limit"));
}

#[test]
fn test_for_method_get_document() {
    let info = MethodParamInfo::for_method("get_document").unwrap();
    assert_eq!(info.required_params.len(), 3);
    assert!(info.required_params.contains(&"documentId"));
}

#[test]
fn test_for_method_get_identity() {
    let info = MethodParamInfo::for_method("get_identity").unwrap();
    assert_eq!(info.required_params, vec!["identityId"]);
}

#[test]
fn test_for_method_get_identity_balance() {
    let info = MethodParamInfo::for_method("get_identity_balance").unwrap();
    assert!(info.required_params.contains(&"identityId"));
}

#[test]
fn test_for_method_get_identity_token_balances() {
    let info = MethodParamInfo::for_method("get_identity_token_balances").unwrap();
    assert!(info.required_params.contains(&"identityId"));
    assert!(info.required_params.contains(&"tokenIds"));
    assert_eq!(info.param_types.get("tokenIds"), Some(&"array"));
}

#[test]
fn test_for_method_data_contract_fetch() {
    let info = MethodParamInfo::for_method("data_contract_fetch").unwrap();
    assert!(info.required_params.contains(&"contractId"));
}

#[test]
fn test_for_method_dpns_resolve_name() {
    let info = MethodParamInfo::for_method("dpns_resolve_name").unwrap();
    assert!(info.required_params.contains(&"username"));
}

#[test]
fn test_for_method_resolve_dpns_name() {
    let info = MethodParamInfo::for_method("resolve_dpns_name").unwrap();
    assert!(info.required_params.contains(&"username"));
}

#[test]
fn test_for_method_get_dpns_username() {
    let info = MethodParamInfo::for_method("get_dpns_username").unwrap();
    assert!(info.required_params.contains(&"identityId"));
}

#[test]
fn test_for_method_get_dpns_usernames() {
    let info = MethodParamInfo::for_method("get_dpns_usernames").unwrap();
    assert!(info.required_params.contains(&"identityId"));
}

#[test]
fn test_for_method_get_token_contract_info() {
    let info = MethodParamInfo::for_method("get_token_contract_info").unwrap();
    assert!(info.required_params.contains(&"dataContractId"));
}

#[test]
fn test_for_method_get_token_statuses() {
    let info = MethodParamInfo::for_method("get_token_statuses").unwrap();
    assert!(info.required_params.contains(&"tokenIds"));
    assert_eq!(info.param_types.get("tokenIds"), Some(&"array"));
}

#[test]
fn test_for_method_get_token_total_supply() {
    let info = MethodParamInfo::for_method("get_token_total_supply").unwrap();
    assert!(info.required_params.contains(&"tokenId"));
}

#[test]
fn test_for_method_get_status() {
    let info = MethodParamInfo::for_method("get_status").unwrap();
    assert!(info.required_params.is_empty());
    assert!(info.param_types.is_empty());
}

#[test]
fn test_for_method_get_current_epoch() {
    let info = MethodParamInfo::for_method("get_current_epoch").unwrap();
    assert!(info.required_params.is_empty());
}

#[test]
fn test_for_method_get_total_credits_in_platform() {
    let info = MethodParamInfo::for_method("get_total_credits_in_platform").unwrap();
    assert!(info.required_params.is_empty());
}

#[test]
fn test_for_method_get_identities_balances() {
    let info = MethodParamInfo::for_method("get_identities_balances").unwrap();
    assert!(info.required_params.contains(&"identityIds"));
    assert_eq!(info.param_types.get("identityIds"), Some(&"array"));
}

#[test]
fn test_for_method_unknown() {
    let result = MethodParamInfo::for_method("totally_unknown");
    assert!(result.is_err());
}

#[test]
fn test_for_method_get_identity_by_public_key_hash() {
    let info = MethodParamInfo::for_method("get_identity_by_public_key_hash").unwrap();
    assert!(info.required_params.contains(&"publicKeyHash"));
}

#[test]
fn test_for_method_get_identity_by_non_unique_public_key_hash() {
    let info =
        MethodParamInfo::for_method("get_identity_by_non_unique_public_key_hash").unwrap();
    assert!(info.required_params.contains(&"publicKeyHash"));
}

// ==================== validate_dapi_params ====================

#[test]
fn test_validate_valid_string_param() {
    let mut params = HashMap::new();
    params.insert("identityId".to_string(), json!("valid_id"));
    let result = validate_dapi_params("get_identity", &params);
    assert!(result.is_ok());
}

#[test]
fn test_validate_missing_required_param() {
    let params = HashMap::new();
    let result = validate_dapi_params("get_identity", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_invalid_string_type() {
    let mut params = HashMap::new();
    params.insert("identityId".to_string(), json!(12345));
    let result = validate_dapi_params("get_identity", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_valid_number_type() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("contract_123"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("limit".to_string(), json!(10));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_ok());
}

#[test]
fn test_validate_invalid_number_type() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("contract_123"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("limit".to_string(), json!("not_a_number"));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_valid_array_type() {
    let mut params = HashMap::new();
    params.insert("tokenIds".to_string(), json!(["tok1", "tok2"]));
    let result = validate_dapi_params("get_token_statuses", &params);
    assert!(result.is_ok());
}

#[test]
fn test_validate_invalid_array_type() {
    let mut params = HashMap::new();
    params.insert("tokenIds".to_string(), json!("not_an_array"));
    let result = validate_dapi_params("get_token_statuses", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_valid_object_type() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("whereClause".to_string(), json!({"$ownerId": "abc"}));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_ok());
}

#[test]
fn test_validate_object_type_allows_null() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("whereClause".to_string(), json!(null));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_ok());
}

#[test]
fn test_validate_invalid_object_type() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("whereClause".to_string(), json!("not_an_object"));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_unknown_method() {
    let params = HashMap::new();
    let result = validate_dapi_params("nonexistent_method", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_no_params_method() {
    let params = HashMap::new();
    let result = validate_dapi_params("get_status", &params);
    assert!(result.is_ok());
}

#[test]
fn test_validate_extra_unknown_param_ignored() {
    let mut params = HashMap::new();
    params.insert("identityId".to_string(), json!("valid_id"));
    params.insert("extraParam".to_string(), json!("ignored"));
    let result = validate_dapi_params("get_identity", &params);
    assert!(result.is_ok());
}

// ==================== params_array_to_object ====================

#[test]
fn test_params_array_to_object_valid() {
    let result =
        params_array_to_object("get_identity", vec![json!("my_id")]).unwrap();
    assert_eq!(result.get("identityId").unwrap(), "my_id");
}

#[test]
fn test_params_array_to_object_multiple_params() {
    let result = params_array_to_object(
        "get_document",
        vec![json!("cid"), json!("doctype"), json!("docid")],
    )
    .unwrap();
    assert_eq!(result.get("dataContractId").unwrap(), "cid");
    assert_eq!(result.get("documentType").unwrap(), "doctype");
    assert_eq!(result.get("documentId").unwrap(), "docid");
}

#[test]
fn test_params_array_to_object_extra_params_ignored() {
    let result = params_array_to_object(
        "get_identity",
        vec![json!("id"), json!("extra1"), json!("extra2")],
    )
    .unwrap();
    assert_eq!(result.len(), 1);
    assert!(result.contains_key("identityId"));
}

#[test]
fn test_params_array_to_object_empty_for_no_params_method() {
    let result = params_array_to_object("get_status", vec![]).unwrap();
    assert!(result.is_empty());
}

#[test]
fn test_params_array_to_object_unknown_method() {
    let result = params_array_to_object("fake_method", vec![]);
    assert!(result.is_err());
}

#[test]
fn test_params_array_to_object_fewer_than_required() {
    // Only 1 param for a method needing 2 — should still work (partial fill)
    let result = params_array_to_object(
        "get_identity_token_balances",
        vec![json!("id_only")],
    )
    .unwrap();
    assert_eq!(result.len(), 1);
    assert!(result.contains_key("identityId"));
    assert!(!result.contains_key("tokenIds"));
}

// ==================== MethodParamInfo clone and debug ====================

#[test]
fn test_method_param_info_clone() {
    let info = MethodParamInfo::for_method("get_identity").unwrap();
    let cloned = info.clone();
    assert_eq!(cloned.required_params, info.required_params);
}

#[test]
fn test_method_param_info_debug() {
    let info = MethodParamInfo::for_method("get_identity").unwrap();
    let debug = format!("{:?}", info);
    assert!(debug.contains("MethodParamInfo"));
}

// ==================== NEW: type validation edge cases ====================

#[test]
fn test_validate_object_type_with_array_fails() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("orderBy".to_string(), json!([["field", "asc"]]));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_object_type_with_number_fails() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("whereClause".to_string(), json!(42));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_object_type_with_boolean_fails() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("whereClause".to_string(), json!(true));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_array_type_with_object_fails() {
    let mut params = HashMap::new();
    params.insert("tokenIds".to_string(), json!({"not": "array"}));
    let result = validate_dapi_params("get_token_statuses", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_array_type_with_number_fails() {
    let mut params = HashMap::new();
    params.insert("tokenIds".to_string(), json!(42));
    let result = validate_dapi_params("get_token_statuses", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_array_type_with_null_fails() {
    let mut params = HashMap::new();
    params.insert("tokenIds".to_string(), json!(null));
    let result = validate_dapi_params("get_token_statuses", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_string_type_with_null_fails() {
    let mut params = HashMap::new();
    params.insert("identityId".to_string(), json!(null));
    let result = validate_dapi_params("get_identity", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_string_type_with_boolean_fails() {
    let mut params = HashMap::new();
    params.insert("identityId".to_string(), json!(true));
    let result = validate_dapi_params("get_identity", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_string_type_with_array_fails() {
    let mut params = HashMap::new();
    params.insert("identityId".to_string(), json!(["not_a_string"]));
    let result = validate_dapi_params("get_identity", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_string_type_with_object_fails() {
    let mut params = HashMap::new();
    params.insert("identityId".to_string(), json!({"not": "string"}));
    let result = validate_dapi_params("get_identity", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_number_type_with_null_fails() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("limit".to_string(), json!(null));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_number_type_with_boolean_fails() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("limit".to_string(), json!(false));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_multiple_required_params_first_missing() {
    let mut params = HashMap::new();
    params.insert("documentType".to_string(), json!("post"));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_multiple_required_params_second_missing() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_all_optional_params_present() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("whereClause".to_string(), json!({"field": "value"}));
    params.insert("orderBy".to_string(), json!({"field": "asc"}));
    params.insert("limit".to_string(), json!(10));
    params.insert("startAfter".to_string(), json!("cursor1"));
    params.insert("startAt".to_string(), json!("cursor2"));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_ok());
}

#[test]
fn test_validate_start_after_invalid_type() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("startAfter".to_string(), json!(123));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_start_at_invalid_type() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("startAt".to_string(), json!(false));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

// ==================== NEW: params_array_to_object edge cases ====================

#[test]
fn test_params_array_to_object_get_documents_two_required() {
    let result = params_array_to_object(
        "get_documents",
        vec![json!("contract_id"), json!("doc_type")],
    )
    .unwrap();
    assert_eq!(result.len(), 2);
    assert_eq!(result.get("dataContractId").unwrap(), "contract_id");
    assert_eq!(result.get("documentType").unwrap(), "doc_type");
}

#[test]
fn test_params_array_to_object_empty_array_for_required_method() {
    let result = params_array_to_object("get_identity", vec![]).unwrap();
    assert!(result.is_empty());
}

#[test]
fn test_params_array_to_object_identity_token_balances() {
    let result = params_array_to_object(
        "get_identity_token_balances",
        vec![json!("my_id"), json!(["tok1", "tok2"])],
    )
    .unwrap();
    assert_eq!(result.len(), 2);
    assert_eq!(result.get("identityId").unwrap(), "my_id");
    assert!(result.get("tokenIds").unwrap().is_array());
}

#[test]
fn test_params_array_to_object_no_params_method_with_extra() {
    let result = params_array_to_object(
        "get_current_epoch",
        vec![json!("extra1"), json!("extra2")],
    )
    .unwrap();
    assert!(result.is_empty());
}

// ==================== NEW: DAPIError variant matching ====================

#[test]
fn test_validate_missing_param_error_contains_name() {
    let params = HashMap::new();
    let result = validate_dapi_params("get_identity", &params);
    match result {
        Err(DAPIError::MissingParameter(name)) => assert_eq!(name, "identityId"),
        other => panic!("Expected MissingParameter, got {:?}", other),
    }
}

#[test]
fn test_validate_invalid_type_error_contains_details() {
    let mut params = HashMap::new();
    params.insert("identityId".to_string(), json!(42));
    let result = validate_dapi_params("get_identity", &params);
    match result {
        Err(DAPIError::InvalidParameterType(name, expected, _actual)) => {
            assert_eq!(name, "identityId");
            assert_eq!(expected, "string");
        }
        other => panic!("Expected InvalidParameterType, got {:?}", other),
    }
}

#[test]
fn test_unknown_method_error() {
    let result = MethodParamInfo::for_method("bogus_method_xyz");
    match result {
        Err(DAPIError::UnknownMethod(name)) => assert_eq!(name, "bogus_method_xyz"),
        other => panic!("Expected UnknownMethod, got {:?}", other),
    }
}

// ==================== NEW: number type with array/object fails ====================

#[test]
fn test_validate_number_type_with_array_fails() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("limit".to_string(), json!([1, 2, 3]));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_number_type_with_object_fails() {
    let mut params = HashMap::new();
    params.insert("dataContractId".to_string(), json!("cid"));
    params.insert("documentType".to_string(), json!("post"));
    params.insert("limit".to_string(), json!({"not": "number"}));
    let result = validate_dapi_params("get_documents", &params);
    assert!(result.is_err());
}

#[test]
fn test_validate_array_type_with_boolean_fails() {
    let mut params = HashMap::new();
    params.insert("tokenIds".to_string(), json!(true));
    let result = validate_dapi_params("get_token_statuses", &params);
    assert!(result.is_err());
}

// ==================== NEW: params_array with data_contract_fetch ====================

#[test]
fn test_params_array_to_object_data_contract_fetch() {
    let result = params_array_to_object(
        "data_contract_fetch",
        vec![json!("my_contract_id")],
    )
    .unwrap();
    assert_eq!(result.len(), 1);
    assert_eq!(result.get("contractId").unwrap(), "my_contract_id");
}

#[test]
fn test_params_array_to_object_dpns_resolve() {
    let result = params_array_to_object(
        "dpns_resolve_name",
        vec![json!("username123")],
    )
    .unwrap();
    assert_eq!(result.len(), 1);
    assert_eq!(result.get("username").unwrap(), "username123");
}

#[test]
fn test_params_array_to_object_identities_balances() {
    let result = params_array_to_object(
        "get_identities_balances",
        vec![json!(["id1", "id2", "id3"])],
    )
    .unwrap();
    assert_eq!(result.len(), 1);
    assert!(result.get("identityIds").unwrap().is_array());
}
