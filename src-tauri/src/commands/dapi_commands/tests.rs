// src-tauri/src/commands/dapi_commands/tests.rs

use serde_json::json;
use crate::dapi::client::params_array_to_object;

#[test]
fn test_params_conversion_invalid_method() {
    // Now that we removed the catch-all, this should return Err(UnknownMethod)
    let res = params_array_to_object("invalid_method_name_xyz", vec![]);
    assert!(res.is_err(), "Conversion MUST fail for unknown DAPI method");
}

#[test]
fn test_params_conversion_valid_logic() {
    let mock_params = vec![json!("test_identity_id")];
    // Use a method name that exists in the validation registry
    let res = params_array_to_object("getIdentity", mock_params);
    match res {
        Ok(map) => {
            assert!(!map.is_empty());
            assert!(map.contains_key("identityId"));
            assert_eq!(map.get("identityId").unwrap(), "test_identity_id");
        },
        Err(e) => panic!("Mapping logic failed for valid method: {:?}", e),
    }
}
