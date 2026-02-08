// src-tauri/src/commands/dapi_commands/tests.rs

use super::*;
use serde_json::json;
use crate::dapi::client::params_array_to_object;

#[test]
fn test_params_conversion_invalid_method() {
    // Should return Err because the catch-all in validation.rs was removed
    let res = params_array_to_object("__NONEXISTENT_METHOD__", vec![]);
    assert!(res.is_err(), "Conversion MUST fail for unknown DAPI method");
}

#[test]
fn test_params_conversion_valid_logic() {
    let mock_params = vec![json!("test_id")];
    // 'getIdentity' is a valid method in MethodParamInfo
    let res = params_array_to_object("getIdentity", mock_params);

    match res {
        Ok(map) => {
            assert!(!map.is_empty(), "Map should not be empty for valid method");
            assert!(map.contains_key("identityId"));
            assert_eq!(map.get("identityId").unwrap(), "test_id");
        },
        Err(e) => panic!("Mapping logic failed for valid method: {:?}", e),
    }
}
