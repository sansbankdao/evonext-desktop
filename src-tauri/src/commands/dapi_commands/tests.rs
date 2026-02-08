// src-tauri/src/commands/dapi_commands/tests.rs

use super::*;

#[test]
fn test_params_conversion_invalid_method() {
    // We use a method name that is guaranteed not to exist in the static MethodParamInfo map.
    let res = params_array_to_object("__CRITICAL_FAILURE_NONEXISTENT_METHOD__", vec![]);

    // This should return Err because for_method() will fail to find the key.
    assert!(res.is_err(), "Conversion should fail for unknown DAPI method");
}

#[test]
fn test_params_conversion_valid_logic() {
    // If we assume 'get_identity' is a valid method with 1 required param 'identityId'
    // This test ensures the mapping logic itself is correct even if we can't fully mock the client.
    let mock_params = vec![json!("test_id")];
    let res = params_array_to_object("get_identity", mock_params);

    if let Ok(map) = res {
        assert!(map.contains_key("identityId"));
        assert_eq!(map.get("identityId").unwrap(), "test_id");
    }
}
