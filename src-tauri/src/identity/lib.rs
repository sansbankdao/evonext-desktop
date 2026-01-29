// src-tauri/src/identity/lib.rs

use crate::models::{IdentityData, IdentityPublicKey, PrivateKeyStore};
use std::collections::HashMap;
use base64::{engine::general_purpose, Engine};
use bitcoin::secp256k1::Secp256k1;
use bitcoin::PrivateKey;
use ripemd::Ripemd160;
use serde_json::Value as JsonValue;
use sha2::{Digest, Sha256};

pub type IdentityMap = HashMap<String, IdentityData>;

// =====================================================
// LOGIC: Normalization & Matching
// =====================================================
/// Normalizes a public key entry from DAPI format to Internal format
pub fn normalize_public_key(default_id: u32, raw: &JsonValue) -> Option<IdentityPublicKey> {
    let obj = raw.as_object()?;

    // 1. Extract 'data' (hex) or decode from 'dataB64'
    let data = if let Some(d) = obj.get("data").and_then(|v| v.as_str()) {
        d.to_string()
    } else if let Some(b64) = obj.get("dataB64").and_then(|v| v.as_str()) {
        let bytes = general_purpose::STANDARD.decode(b64).ok()?;
        hex::encode(bytes)
    } else {
        return None;
    };

    // 2. Normalize Purpose
    let purpose = match obj.get("purpose") {
        Some(JsonValue::Number(n)) => n.as_u64().unwrap_or(0) as u32,
        Some(JsonValue::String(s)) => match s.to_uppercase().as_str() {
            "AUTHENTICATION" => 0,
            "ENCRYPTION" => 1,
            "DECRYPTION" => 2,
            "TRANSFER" => 3,
            _ => 0,
        },
        _ => 0,
    };

    // 3. Normalize SecurityLevel
    let security_level = match obj.get("securityLevel") {
        Some(JsonValue::Number(n)) => n.as_u64().unwrap_or(0) as u32,
        Some(JsonValue::String(s)) => match s.to_uppercase().as_str() {
            "MASTER" => 0,
            "CRITICAL" => 1,
            "HIGH" => 2,
            "MEDIUM" => 3,
            "LOW" => 4,
            _ => 0,
        },
        _ => 0,
    };

    Some(IdentityPublicKey {
        id: obj.get("id")
            .and_then(|v| v.as_u64())
            .map(|n| n as u32)
            .unwrap_or(default_id),
        type_: obj.get("type")
            .or(obj.get("keyType"))
            .and_then(|v| v.as_str())
            .unwrap_or("UNKNOWN")
            .to_string(),
        purpose,
        security_level,
        data,
        read_only: obj.get("readOnly")
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        disabled_at: obj.get("disabledAt")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string()),
    })
}

/// Derives a compressed public key hex from a WIF private key
pub fn derive_compressed_pubkey_hex_from_wif(wif: &str) -> Option<String> {
    let pk = PrivateKey::from_wif(wif).ok()?;
    let secp = Secp256k1::new();
    Some(hex::encode(pk.public_key(&secp).inner.serialize()))
}

/// Calculates Hash160 of a byte array
pub fn hash160_bytes(data: &[u8]) -> String {
    let sha = Sha256::digest(data);
    let ripe = Ripemd160::digest(sha);
    hex::encode(ripe)
}

/// Enriches a list of key entries by matching them against identity data
pub fn enrich_key_entries(
    entries: &mut Vec<crate::models::PrivateKeyEntry>,
    identity: &IdentityData,
) -> usize {
    let mut updated = 0;

    for entry in entries.iter_mut() {
        // A. Derive public key if missing
        if entry.public_key.is_empty() {
            if let Some(pub_hex) = derive_compressed_pubkey_hex_from_wif(&entry.private_key) {
                entry.public_key = pub_hex;
                updated += 1;
            }
        }

        // B. Match local key against on-chain data
        if !entry.public_key.is_empty() {
            let pub_bytes = hex::decode(&entry.public_key).unwrap_or_default();
            let hash160 = hash160_bytes(&pub_bytes);

            if let Some(pks) = &identity.public_keys {
                for pk in pks {
                    let matches_full = pk.data.eq_ignore_ascii_case(&entry.public_key);
                    let matches_hash160 = pk.data.eq_ignore_ascii_case(&hash160);

                    if matches_full || matches_hash160 {
                        entry.purpose = pk.purpose;
                        entry.security_level = pk.security_level;
                        entry.key_id = pk.id;
                    }
                }
            }
        }
    }
    updated
}
