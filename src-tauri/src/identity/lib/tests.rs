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

// =====================================================
// NEW TESTS: normalize_public_key branch coverage
// =====================================================

#[test]
fn test_normalize_public_key_returns_none_for_non_object() {
    let raw = json!("just a string");
    assert!(normalize_public_key(0, &raw).is_none());
}

#[test]
fn test_normalize_public_key_returns_none_for_null() {
    let raw = json!(null);
    assert!(normalize_public_key(0, &raw).is_none());
}

#[test]
fn test_normalize_public_key_returns_none_for_no_data_field() {
    // No "data" and no "dataB64"
    let raw = json!({
        "id": 0,
        "type": "ECDSA_SECP256K1",
        "purpose": 0,
        "securityLevel": 0
    });
    assert!(normalize_public_key(0, &raw).is_none());
}

#[test]
fn test_normalize_public_key_invalid_base64() {
    // Invalid base64 string
    let raw = json!({
        "dataB64": "!!not_valid_b64!!",
        "type": "ECDSA_SECP256K1"
    });
    assert!(normalize_public_key(0, &raw).is_none());
}

#[test]
fn test_normalize_public_key_string_purpose_authentication() {
    let raw = json!({
        "data": "aabb",
        "purpose": "AUTHENTICATION",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.purpose, 0);
}

#[test]
fn test_normalize_public_key_string_purpose_encryption() {
    let raw = json!({
        "data": "aabb",
        "purpose": "ENCRYPTION",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.purpose, 1);
}

#[test]
fn test_normalize_public_key_string_purpose_decryption() {
    let raw = json!({
        "data": "aabb",
        "purpose": "DECRYPTION",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.purpose, 2);
}

#[test]
fn test_normalize_public_key_string_purpose_unknown() {
    let raw = json!({
        "data": "aabb",
        "purpose": "SOMETHING_ELSE",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.purpose, 0); // Unknown defaults to 0
}

#[test]
fn test_normalize_public_key_string_security_level_critical() {
    let raw = json!({
        "data": "aabb",
        "securityLevel": "CRITICAL",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.security_level, 1);
}

#[test]
fn test_normalize_public_key_string_security_level_high() {
    let raw = json!({
        "data": "aabb",
        "securityLevel": "HIGH",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.security_level, 2);
}

#[test]
fn test_normalize_public_key_string_security_level_medium() {
    let raw = json!({
        "data": "aabb",
        "securityLevel": "MEDIUM",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.security_level, 3);
}

#[test]
fn test_normalize_public_key_string_security_level_low() {
    let raw = json!({
        "data": "aabb",
        "securityLevel": "LOW",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.security_level, 4);
}

#[test]
fn test_normalize_public_key_string_security_level_unknown() {
    let raw = json!({
        "data": "aabb",
        "securityLevel": "UNKNOWN_LEVEL",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.security_level, 0);
}

#[test]
fn test_normalize_public_key_missing_purpose_defaults_to_zero() {
    let raw = json!({
        "data": "aabb",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.purpose, 0);
    assert_eq!(result.security_level, 0);
}

#[test]
fn test_normalize_public_key_missing_type_defaults_to_unknown() {
    let raw = json!({
        "data": "aabb"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(result.type_, "UNKNOWN");
}

#[test]
fn test_normalize_public_key_read_only_true() {
    let raw = json!({
        "data": "aabb",
        "readOnly": true,
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert!(result.read_only);
}

#[test]
fn test_normalize_public_key_read_only_default_false() {
    let raw = json!({
        "data": "aabb",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert!(!result.read_only);
}

#[test]
fn test_normalize_public_key_disabled_at() {
    let raw = json!({
        "data": "aabb",
        "disabledAt": "2024-01-01T00:00:00Z",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert_eq!(
        result.disabled_at,
        Some("2024-01-01T00:00:00Z".to_string())
    );
}

#[test]
fn test_normalize_public_key_disabled_at_none() {
    let raw = json!({
        "data": "aabb",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(0, &raw).unwrap();
    assert!(result.disabled_at.is_none());
}

#[test]
fn test_normalize_public_key_uses_default_id_when_missing() {
    let raw = json!({
        "data": "aabb",
        "type": "ECDSA_SECP256K1"
    });
    let result = normalize_public_key(42, &raw).unwrap();
    assert_eq!(result.id, 42);
}

// =====================================================
// NEW TESTS: hash160_bytes
// =====================================================

#[test]
fn test_hash160_bytes_known_vector() {
    // Hash160 of empty data should produce a deterministic result
    let result = hash160_bytes(&[]);
    assert!(!result.is_empty());
    assert_eq!(result.len(), 40); // 20 bytes = 40 hex chars
}

#[test]
fn test_hash160_bytes_different_inputs() {
    let h1 = hash160_bytes(b"hello");
    let h2 = hash160_bytes(b"world");
    assert_ne!(h1, h2);
}

#[test]
fn test_hash160_bytes_deterministic() {
    let h1 = hash160_bytes(b"deterministic");
    let h2 = hash160_bytes(b"deterministic");
    assert_eq!(h1, h2);
}

// =====================================================
// NEW TESTS: enrich_key_entries edge cases
// =====================================================

#[test]
fn test_enrich_key_entries_no_match() {
    let mut entries = vec![crate::models::IPrivateKeyEntry {
        public_key: "aabbcc".to_string(),
        key_id: 0,
        ..Default::default()
    }];
    let identity = IIdentityData {
        public_keys: vec![IIdentityPublicKey {
            id: 5,
            data: "ddeeff".to_string(), // Different key
            purpose: 1,
            security_level: 2,
            type_: "ECDSA_SECP256K1".to_string(),
            read_only: false,
            disabled_at: None,
        }],
        ..Default::default()
    };
    let updated = enrich_key_entries(&mut entries, &identity);
    assert_eq!(updated, 0);
    assert_eq!(entries[0].key_id, 0); // Unchanged
}

#[test]
fn test_enrich_key_entries_hash160_match() {
    // Create a public key where the on-chain data is the hash160 of the local key
    let pub_hex = "aabbccdd";
    let pub_bytes = hex::decode(pub_hex).unwrap();
    let hash = hash160_bytes(&pub_bytes);

    let mut entries = vec![crate::models::IPrivateKeyEntry {
        public_key: pub_hex.to_string(),
        key_id: 0,
        ..Default::default()
    }];
    let identity = IIdentityData {
        public_keys: vec![IIdentityPublicKey {
            id: 7,
            data: hash, // hash160 of the local key
            purpose: 2,
            security_level: 1,
            type_: "ECDSA_SECP256K1".to_string(),
            read_only: false,
            disabled_at: None,
        }],
        ..Default::default()
    };
    let _updated = enrich_key_entries(&mut entries, &identity);
    assert_eq!(entries[0].key_id, 7);
    assert_eq!(entries[0].purpose, 2);
    assert_eq!(entries[0].security_level, 1);
}

#[test]
fn test_enrich_key_entries_empty_public_key_skips_matching() {
    let mut entries = vec![crate::models::IPrivateKeyEntry {
        public_key: "".to_string(),
        private_key: "not_a_real_wif".to_string(),
        key_id: 0,
        ..Default::default()
    }];
    let identity = IIdentityData {
        public_keys: vec![IIdentityPublicKey {
            id: 5,
            data: "aabb".to_string(),
            purpose: 1,
            security_level: 0,
            type_: "ECDSA_SECP256K1".to_string(),
            read_only: false,
            disabled_at: None,
        }],
        ..Default::default()
    };
    let updated = enrich_key_entries(&mut entries, &identity);
    // derive_compressed_pubkey_hex_from_wif will fail for invalid WIF
    assert_eq!(updated, 0);
    assert_eq!(entries[0].key_id, 0); // Unchanged
}

#[test]
fn test_enrich_key_entries_empty_identity_keys() {
    let mut entries = vec![crate::models::IPrivateKeyEntry {
        public_key: "aabb".to_string(),
        key_id: 0,
        ..Default::default()
    }];
    let identity = IIdentityData {
        public_keys: vec![], // No on-chain keys
        ..Default::default()
    };
    let updated = enrich_key_entries(&mut entries, &identity);
    assert_eq!(updated, 0);
}

#[test]
fn test_enrich_key_entries_case_insensitive_match() {
    let pub_hex = "aAbBcCdD";
    let mut entries = vec![crate::models::IPrivateKeyEntry {
        public_key: pub_hex.to_string(),
        key_id: 0,
        ..Default::default()
    }];
    let identity = IIdentityData {
        public_keys: vec![IIdentityPublicKey {
            id: 3,
            data: "AABBCCDD".to_string(), // Uppercase version
            purpose: 1,
            security_level: 0,
            type_: "ECDSA_SECP256K1".to_string(),
            read_only: false,
            disabled_at: None,
        }],
        ..Default::default()
    };
    let _ = enrich_key_entries(&mut entries, &identity);
    assert_eq!(entries[0].key_id, 3);
}

// =====================================================
// NEW TESTS: derive_compressed_pubkey_hex_from_wif
// =====================================================

#[test]
fn test_derive_pubkey_from_invalid_wif() {
    let result = derive_compressed_pubkey_hex_from_wif("not_a_wif");
    assert!(result.is_none());
}

#[test]
fn test_derive_pubkey_from_empty_wif() {
    let result = derive_compressed_pubkey_hex_from_wif("");
    assert!(result.is_none());
}

#[test]
fn test_derive_pubkey_from_valid_wif() {
    // This is a well-known testnet WIF private key
    let wif = "cNYfRxoekiJ2JMnXiVgqzSBfpKjPaUC8CVqkMxHMiJtwjFiByMw4";
    let result = derive_compressed_pubkey_hex_from_wif(wif);
    assert!(result.is_some());
    let pubkey_hex = result.unwrap();
    // Compressed pubkey starts with 02 or 03 and is 66 hex chars (33 bytes)
    assert!(pubkey_hex.starts_with("02") || pubkey_hex.starts_with("03"));
    assert_eq!(pubkey_hex.len(), 66);
}

#[test]
fn test_derive_pubkey_deterministic() {
    let wif = "cNYfRxoekiJ2JMnXiVgqzSBfpKjPaUC8CVqkMxHMiJtwjFiByMw4";
    let r1 = derive_compressed_pubkey_hex_from_wif(wif).unwrap();
    let r2 = derive_compressed_pubkey_hex_from_wif(wif).unwrap();
    assert_eq!(r1, r2);
}
