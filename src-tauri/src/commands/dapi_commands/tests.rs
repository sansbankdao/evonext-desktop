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
    let res = params_array_to_object("getIdentity", mock_params);
    let map = res.unwrap();
    assert!(map.contains_key("identityId"));
    assert_eq!(map.get("identityId").unwrap(), "test_identity_id");
}

#[tokio::test]
async fn test_dapi_request_validation_failure() {
    // This tests the guard logic in dapi_request before it hits the network client
    let app = tauri::test::mock_builder().build(tauri::generate_context!()).unwrap();
    let mut params = HashMap::new();
    params.insert("wrong_key".to_string(), json!(123));

    let res = dapi_request(app.handle().clone(), "getIdentity".into(), params, None).await;
    // Should fail because identityId is missing in required params
    assert!(res.is_err());
}
