// src-tauri/src/commands/identity_commands/tests.rs

use super::*;
use serde_json::json;

#[test]
fn test_identity_mapper_discovery_regression() {
    let payload = ISaveIdentityPayload {
        identity_id: "test_id".into(),
        username: "user".into(),
        balance: "100".into(),
        public_keys: vec![IAnyValue(json!({ "id": 0, "data": "A1B2", "type": "ECDSA_SECP256K1" }))],
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert_eq!(result.identity_id, "test_id");
    assert_eq!(result.public_keys.len(), 1);
}

#[test]
fn test_identity_mapper_malformed_keys() {
    let payload = ISaveIdentityPayload {
        public_keys: vec![IAnyValue(json!({ "garbage": true }))],
        ..Default::default()
    };
    let result = IdentityMapper::map_to_identity(payload);
    assert_eq!(result.public_keys.len(), 0);
}
