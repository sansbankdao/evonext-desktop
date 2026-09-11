// src-tauri/src/vault/tests.rs
//
//! Vault unit tests. These run WITHOUT an AppHandle: the vault core is
//! path-parameterized (`Vault::open_at`) precisely so the crypto behavior
//! is testable in isolation. The AppHandle-level routing + lazy migration
//! path is covered by `integration_tests.rs` via `storage::save_keystore`
//! (rewired to `VaultStore`) against a mock Tauri app.

use super::procedures::DashEcdsaPrehashSign;
use super::{
    is_safu_file, key_from_file, migrate_safu_value, shred_file, KeyOrigin, Vault, SNAPSHOT_FILE,
};
use iota_stronghold::{
    procedures::{GenerateKey, KeyType, Procedure, PublicKey as PublicKeyProc},
    KeyProvider, Location,
};
use k256::ecdsa::{signature::hazmat::PrehashVerifier, Signature, VerifyingKey};
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

fn test_key_provider(byte: u8) -> KeyProvider {
    KeyProvider::try_from(Zeroizing::new(vec![byte; 32])).expect("keyprovider")
}

fn open_test_vault(dir: &std::path::Path, byte: u8) -> Vault {
    Vault::open_at(dir, test_key_provider(byte), KeyOrigin::FallbackFile).expect("open test vault")
}

#[test]
fn blob_roundtrip_insert_get_delete() {
    let dir = tempfile::tempdir().expect("tempdir");
    let vault = open_test_vault(dir.path(), 0xA1);

    assert_eq!(
        vault.load_blob(".safu-testnet.json", "keystore").unwrap(),
        None
    );

    vault
        .save_blob(".safu-testnet.json", "keystore", b"{\"identities\":{}}")
        .unwrap();
    assert_eq!(
        vault.load_blob(".safu-testnet.json", "keystore").unwrap(),
        Some(b"{\"identities\":{}}".to_vec())
    );

    // Namespace separation: same key, different file must not collide.
    assert_eq!(
        vault.load_blob(".safu-mainnet.json", "keystore").unwrap(),
        None
    );

    vault.delete_blob(".safu-testnet.json", "keystore").unwrap();
    assert_eq!(
        vault.load_blob(".safu-testnet.json", "keystore").unwrap(),
        None
    );
}

#[test]
fn snapshot_persists_and_rejects_wrong_key() {
    let dir = tempfile::tempdir().expect("tempdir");
    let payload = b"secret-keystore-bytes";

    {
        let vault = open_test_vault(dir.path(), 0xB2);
        vault
            .save_blob(".safu-testnet.json", "keystore", payload)
            .unwrap();
    }
    assert!(
        dir.path().join(SNAPSHOT_FILE).exists(),
        "snapshot committed"
    );

    // On-disk bytes must not contain the plaintext payload.
    let raw = std::fs::read(dir.path().join(SNAPSHOT_FILE)).unwrap();
    assert!(
        !raw.windows(payload.len()).any(|w| w == payload.as_slice()),
        "snapshot must not contain the keystore blob in cleartext"
    );

    // Same key reopens and returns the blob.
    let vault = open_test_vault(dir.path(), 0xB2);
    assert_eq!(
        vault.load_blob(".safu-testnet.json", "keystore").unwrap(),
        Some(payload.to_vec())
    );

    // Wrong key is refused AT OPEN (age decryption fails) — no silent
    // plaintext, no silent reset.
    assert!(Vault::open_at(dir.path(), test_key_provider(0xC3), KeyOrigin::FallbackFile).is_err());
}

#[test]
fn fallback_key_file_roundtrip_and_permissions() {
    let dir = tempfile::tempdir().expect("tempdir");
    let key_path = dir.path().join("vault").join("snapshot.key");

    let first = key_from_file(&key_path).expect("create key file");
    let second = key_from_file(&key_path).expect("reload key file");
    assert_eq!(first, second, "same key across reads");

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mode = std::fs::metadata(&key_path).unwrap().permissions().mode();
        assert_eq!(mode & 0o777, 0o600, "key file must be 0600");
    }

    // Corrupt length is refused, never silently rotated.
    std::fs::write(&key_path, b"too-short").unwrap();
    assert!(key_from_file(&key_path).is_err());
}

#[test]
fn safu_routing_detection() {
    assert!(is_safu_file(".safu-mainnet.json"));
    assert!(is_safu_file(".safu-testnet.json"));
    assert!(!is_safu_file(".identity-testnet.json"));
    assert!(!is_safu_file(".assets-mainnet.json"));
    assert!(!is_safu_file("anything-else.json"));
}

#[test]
fn shred_file_overwrites_and_removes() {
    let dir = tempfile::tempdir().expect("tempdir");
    let victim = dir.path().join(".safu-testnet.json");
    std::fs::write(
        &victim,
        b"{\"keystore\":{\"mnemonic\":\"plaintext seed words\"}}",
    )
    .unwrap();

    shred_file(&victim).expect("shred");
    assert!(!victim.exists(), "legacy file removed");

    // Idempotent on missing files.
    shred_file(&victim).expect("shred of missing file is a no-op");
}

#[test]
fn migration_moves_legacy_value_and_shreds() {
    let dir = tempfile::tempdir().expect("tempdir");
    let vault = open_test_vault(dir.path(), 0xE5);
    let legacy_path = dir.path().join(".safu-testnet.json");
    let legacy_value = serde_json::json!({
        "identities": { "id-1": [{ "keyId": 0, "privateKey": "deadbeef" }] },
        "mnemonic": { "mnemonic": "abandon abandon abandon", "createdAt": 1 }
    });
    std::fs::write(&legacy_path, serde_json::to_vec(&legacy_value).unwrap()).unwrap();

    migrate_safu_value(
        &vault,
        ".safu-testnet.json",
        Some(legacy_value.clone()),
        &legacy_path,
    )
    .expect("migrate");

    let blob = vault
        .load_blob(".safu-testnet.json", "keystore")
        .unwrap()
        .expect("migrated blob present");
    let migrated: serde_json::Value = serde_json::from_slice(&blob).unwrap();
    assert_eq!(migrated, legacy_value, "1:1 value parity after migration");
    assert!(!legacy_path.exists(), "legacy plaintext shredded");
}

#[test]
fn migration_never_overwrites_existing_vault_blob() {
    let dir = tempfile::tempdir().expect("tempdir");
    let vault = open_test_vault(dir.path(), 0xE6);
    let legacy_path = dir.path().join(".safu-mainnet.json");

    // Vault already authoritative (e.g. user saved post-migration, then an
    // old backup .safu file reappeared): vault content wins, file shredded.
    vault
        .save_blob(".safu-mainnet.json", "keystore", b"{\"current\":true}")
        .unwrap();
    std::fs::write(&legacy_path, b"{\"stale\":true}").unwrap();

    migrate_safu_value(
        &vault,
        ".safu-mainnet.json",
        Some(serde_json::json!({"stale": true})),
        &legacy_path,
    )
    .expect("migrate");

    assert_eq!(
        vault.load_blob(".safu-mainnet.json", "keystore").unwrap(),
        Some(b"{\"current\":true}".to_vec()),
        "existing vault blob must NOT be overwritten by legacy data"
    );
    assert!(!legacy_path.exists());
}

#[test]
fn migration_shreds_stale_empty_legacy_file() {
    let dir = tempfile::tempdir().expect("tempdir");
    let vault = open_test_vault(dir.path(), 0xE7);
    let legacy_path = dir.path().join(".safu-testnet.json");
    // Legacy file exists but holds no keystore value (None): still a
    // plaintext-secrets-shaped file at a well-known path -> shred it.
    std::fs::write(&legacy_path, b"{}").unwrap();

    migrate_safu_value(&vault, ".safu-testnet.json", None, &legacy_path).expect("migrate");
    assert!(!legacy_path.exists());
    assert_eq!(
        vault.load_blob(".safu-testnet.json", "keystore").unwrap(),
        None
    );
}

#[test]
fn prehash_procedure_signs_exact_digest_in_vault() {
    let dir = tempfile::tempdir().expect("tempdir");
    let vault = open_test_vault(dir.path(), 0xD4);
    let location = Location::generic(b"evonext-keys", b"identity-key-0");

    vault
        .client()
        .execute_procedure(GenerateKey {
            ty: KeyType::Secp256k1Ecdsa,
            output: location.clone(),
        })
        .expect("generate key in vault");
    let pubkey = vault
        .client()
        .execute_procedure(PublicKeyProc {
            ty: KeyType::Secp256k1Ecdsa,
            private_key: location.clone(),
        })
        .expect("derive public key");
    assert_eq!(pubkey.len(), 33, "compressed secp256k1 pubkey");

    // A Dash sighash is ALREADY a double-SHA256 product; no further hashing.
    let sighash: [u8; 32] = Sha256::digest(Sha256::digest(b"tx preimage")).into();
    let sig = DashEcdsaPrehashSign {
        digest: sighash,
        private_key: location,
    }
    .execute(vault.client())
    .expect("prehash sign in vault");
    assert_eq!(sig.len(), 65, "recoverable signature is r||s||v");

    let vk = VerifyingKey::from_sec1_bytes(&pubkey).expect("valid pubkey");
    let compact = Signature::try_from(&sig[..64]).expect("compact signature");
    vk.verify_prehash(&sighash, &compact)
        .expect("signature must verify against the exact digest");
}
