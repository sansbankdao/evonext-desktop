// src-tauri/src/models/tests.rs

use super::*;
use serde_json::json;

#[test]
fn test_de_u32_from_str_or_num() {
    // Test direct number
    let data_num = json!({
        "identityId": "id",
        "username": "u",
        "balance": "0",
        "revision": 123,
        "publicKeys": [],
        "isAuthenticated": true
    });
    let identity: IIdentityData = serde_json::from_value(data_num).unwrap();
    assert_eq!(identity.revision, 123);

    // Test string number
    let data_str = json!({
        "identityId": "id",
        "username": "u",
        "balance": "0",
        "revision": "456",
        "publicKeys": [],
        "isAuthenticated": true
    });
    let identity: IIdentityData = serde_json::from_value(data_str).unwrap();
    assert_eq!(identity.revision, 456);

    // Test empty string / null
    let data_empty = json!({
        "identityId": "id",
        "username": "u",
        "balance": "0",
        "revision": "",
        "publicKeys": [],
        "isAuthenticated": true
    });
    let identity: IIdentityData = serde_json::from_value(data_empty).unwrap();
    assert_eq!(identity.revision, 0);
}

#[test]
fn test_ianyvalue_any_type() {
    let val = IAnyValue(json!({"foo": "bar"}));
    assert_eq!(val.0["foo"], "bar");
}
