// src-tauri/src/commands/dapi_commands/tests.rs

use super::*;
use serde_json::json;

#[test]
fn test_params_conversion_invalid_method() {
    // This will return an Error because the method is not in the static MethodParamInfo mapping
    let res = params_array_to_object("nonexistent_method_xyz_123", vec![]);
    assert!(res.is_err(), "Conversion should fail for unknown DAPI method");
}

#[test]
fn test_params_conversion_valid_logic() {
    // 'getIdentity' is the correct method name used in dapi_commands.rs
    let mock_params = vec![json!("test_id")];

    // Using 'getIdentity' which is a known method in the mapping
    let res = params_array_to_object("getIdentity", mock_params);

    if let Ok(map) = res {
        // The mapping for getIdentity uses 'id' or 'identityId' depending on implementation
        // We assert that the resulting map is not empty and contains our value
        assert!(!map.is_empty());
        let val = map.values().next().unwrap();
        assert_eq!(val, "test_id");
    } else {
        panic!("Mapping logic failed for valid method 'getIdentity'");
    }
}
