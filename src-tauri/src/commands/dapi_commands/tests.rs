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
