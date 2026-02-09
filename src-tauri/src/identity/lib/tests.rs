// src-tauri/src/identity/lib/tests.rs

use super::*;
use serde_json::json;

#[test]
fn test_normalize_public_key_b64_and_enums() {
    let raw = json!({
        "dataB64": "SGVsbG8=", // "Hello" in base64
        "purpose": "TRANSFER",
        "securityLevel": "MASTER",
        "keyType": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(99, &raw).unwrap();
    assert_eq!(result.data, "48656c6c6f"); // "Hello" in hex
    assert_eq!(result.purpose, 3);
    assert_eq!(result.security_level, 0);
    assert_eq!(result.type_, "ECDSA_SECP256K1");
    assert_eq!(result.id, 99);
}

#[test]
fn test_normalize_public_key_numeric_and_hex() {
    let raw = json!({
        "id": 5,
        "data": "aabbcc",
        "purpose": 1,
        "securityLevel": 2,
        "type": "Ed25519"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.id, 5);
    assert_eq!(result.data, "aabbcc");
    assert_eq!(result.purpose, 1);
    assert_eq!(result.security_level, 2);
}

#[test]
fn test_enrich_key_entries_matching() {
    let pub_hex = "02c01977799516892e59e1f57989938b814df340b0f74a00473a24683501a4e12e".to_string();
    let mut entries = vec![crate::models::IPrivateKeyEntry {
        public_key: pub_hex.clone(),
        key_id: 0,
        ..Default::default()
    }];
    let identity = IIdentityData {
        public_keys: vec![IIdentityPublicKey {
            id: 10,
            data: pub_hex,
            purpose: 3,
            security_level: 0,
            type_: "ECDSA_SECP256K1".to_string(),
            read_only: false,
            disabled_at: None,
        }],
        ..Default::default()
    };
    let _ = enrich_key_entries(&mut entries, &identity);
    assert_eq!(entries[0].key_id, 10);
    assert_eq!(entries[0].purpose, 3);
    assert_eq!(entries[0].security_level, 0);
}
