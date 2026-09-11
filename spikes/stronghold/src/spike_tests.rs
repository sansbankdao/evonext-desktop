// spikes/stronghold/src/spike_tests.rs
//
// Executable answers for the Stronghold integration decision. Each test is
// a self-contained proof; see docs/spikes/stronghold-keystore.md.

use super::DashEcdsaPrehashSign;
use iota_stronghold::{
    procedures::{
        GenerateKey, KeyType, Procedure, PublicKey as PublicKeyProc, Secp256k1EcdsaFlavor,
        Secp256k1EcdsaSign,
    },
    KeyProvider, Location, SnapshotPath, Stronghold,
};
use k256::ecdsa::{signature::hazmat::PrehashVerifier, Signature, VerifyingKey};
use sha2::{Digest, Sha256};
use zeroize::Zeroizing;

const VAULT: &[u8] = b"spike-vault";
const KEY: &[u8] = b"identity-key-0";

fn location() -> Location {
    Location::generic(VAULT, KEY)
}

/// Deterministic snapshot key, standing in for either tier of the shipping
/// design: user-password -> KDF -> 32 bytes, or random key from OS keyring /
/// 0600 fallback file. KeyProvider semantics are identical for all three.
fn snapshot_key(byte: u8) -> KeyProvider {
    KeyProvider::try_from(Zeroizing::new(vec![byte; 32])).expect("keyprovider")
}

fn stronghold_with_key(key_byte: u8) -> (Stronghold, iota_stronghold::Client, KeyProvider) {
    let sh = Stronghold::default();
    let client = sh.create_client(b"spike-client").expect("create client");
    let kp = snapshot_key(key_byte);
    (sh, client, kp)
}

fn k256_verify(pubkey_compressed: &[u8], digest: &[u8; 32], sig65: &[u8]) {
    assert_eq!(sig65.len(), 65, "recoverable signature is r||s||v");
    let vk = VerifyingKey::from_sec1_bytes(pubkey_compressed).expect("valid pubkey");
    let sig = Signature::try_from(&sig65[..64]).expect("r||s is a compact signature");
    vk.verify_prehash(digest, &sig)
        .expect("SIGNATURE MUST VERIFY AGAINST THE EXACT DIGEST");
}

// ---------------------------------------------------------------------------
// (a) Built-in in-vault secp256k1: generate, public key, sign, verify.
// ---------------------------------------------------------------------------
#[test]
fn builtin_secp256k1_roundtrip() {
    let (_sh, client, _kp) = stronghold_with_key(0xAA);

    client
        .execute_procedure(GenerateKey {
            ty: KeyType::Secp256k1Ecdsa,
            output: location(),
        })
        .expect("generate key in vault");

    let pubkey = client
        .execute_procedure(PublicKeyProc {
            ty: KeyType::Secp256k1Ecdsa,
            private_key: location(),
        })
        .expect("derive public key");
    assert_eq!(pubkey.len(), 33, "compressed secp256k1 pubkey");

    let msg = b"evonext state transition bytes";
    let sig = client
        .execute_procedure(Secp256k1EcdsaSign {
            flavor: Secp256k1EcdsaFlavor::Sha256,
            msg: msg.to_vec(),
            private_key: location(),
        })
        .expect("in-vault sign");

    // Built-in Sha256 flavor signs SHA256(msg) — verify accordingly.
    let digest: [u8; 32] = Sha256::digest(msg).into();
    k256_verify(&pubkey, &digest, &sig);
}

// ---------------------------------------------------------------------------
// (b) Dash compatibility: sign a RAW 32-byte prehash (sighash) in-vault via
// the custom procedure. This is the capability the built-in lacks.
// ---------------------------------------------------------------------------
#[test]
fn custom_prehash_procedure_signs_exact_digest() {
    let (_sh, client, _kp) = stronghold_with_key(0xBB);

    client
        .execute_procedure(GenerateKey {
            ty: KeyType::Secp256k1Ecdsa,
            output: location(),
        })
        .expect("generate key");
    let pubkey = client
        .execute_procedure(PublicKeyProc {
            ty: KeyType::Secp256k1Ecdsa,
            private_key: location(),
        })
        .expect("pubkey");

    // A Dash sighash is ALREADY a double-SHA256 product; no further hashing.
    let sighash: [u8; 32] = Sha256::digest(Sha256::digest(b"tx preimage")).into();
    let sig = DashEcdsaPrehashSign {
        digest: sighash,
        private_key: location(),
    }
    .execute(&client)
    .expect("prehash sign in vault");

    k256_verify(&pubkey, &sighash, &sig);
}

// ---------------------------------------------------------------------------
// (c) Migration path: an EXISTING 32-byte private key (as currently stored
// in plaintext .safu-{network}.json) imports into the vault and signs.
// ---------------------------------------------------------------------------
#[test]
fn existing_key_imports_and_signs() {
    let (_sh, client, _kp) = stronghold_with_key(0xCC);

    // Stand-in for a key read from today's plaintext keystore.
    let existing: [u8; 32] = {
        let mut k = [0u8; 32];
        k[31] = 7; // small valid scalar
        k
    };
    client
        .vault(VAULT)
        .write_secret(location(), Zeroizing::new(existing.to_vec()))
        .expect("import existing key into vault");

    let pubkey = client
        .execute_procedure(PublicKeyProc {
            ty: KeyType::Secp256k1Ecdsa,
            private_key: location(),
        })
        .expect("pubkey of imported key");

    // Cross-check against k256: the imported key must yield the same pubkey.
    let reference = k256::SecretKey::from_slice(&existing).expect("k256 key");
    assert_eq!(
        pubkey,
        reference.public_key().to_sec1_bytes().as_ref(),
        "vault pubkey must match the same key outside the vault"
    );

    let sighash: [u8; 32] = Sha256::digest(Sha256::digest(b"migration proof")).into();
    let sig = DashEcdsaPrehashSign {
        digest: sighash,
        private_key: location(),
    }
    .execute(&client)
    .expect("sign with imported key");
    k256_verify(&pubkey, &sighash, &sig);
}

// ---------------------------------------------------------------------------
// (d) At-rest encryption: snapshot committed with a key is opaque on disk,
// reopens with the SAME key, and rejects the WRONG key.
// ---------------------------------------------------------------------------
#[test]
fn snapshot_persists_encrypted_and_rejects_wrong_key() {
    let dir = tempfile::tempdir().expect("tempdir");
    let snapshot_path = SnapshotPath::from_path(dir.path().join("evonext.snapshot"));

    let sighash: [u8; 32] = Sha256::digest(Sha256::digest(b"reload proof")).into();
    let pubkey_before;
    let sig_before;

    {
        let (sh, client, kp) = stronghold_with_key(0xDD);
        client
            .execute_procedure(GenerateKey {
                ty: KeyType::Secp256k1Ecdsa,
                output: location(),
            })
            .expect("generate");
        pubkey_before = client
            .execute_procedure(PublicKeyProc {
                ty: KeyType::Secp256k1Ecdsa,
                private_key: location(),
            })
            .expect("pubkey");
        sig_before = DashEcdsaPrehashSign {
                digest: sighash,
            private_key: location(),
        }
        .execute(&client)
        .expect("sign");
        sh.commit_with_keyprovider(&snapshot_path, &kp)
            .expect("commit snapshot");
    }

    // On-disk bytes must NOT contain any recognizable key material marker;
    // at minimum they must differ from plaintext storage of a 33B pubkey.
    let raw = std::fs::read(snapshot_path.as_path()).expect("read snapshot");
    assert!(
        !raw
            .windows(pubkey_before.len())
            .any(|w| w == pubkey_before.as_slice()),
        "snapshot must not contain the public key in cleartext"
    );

    // Reopen with the same key: key material survives, signatures reproduce.
    {
        let sh = Stronghold::default();
        let client = sh
            .load_client_from_snapshot(b"spike-client", &snapshot_key(0xDD), &snapshot_path)
            .expect("reload from snapshot");
        let pubkey_after = client
            .execute_procedure(PublicKeyProc {
                ty: KeyType::Secp256k1Ecdsa,
                private_key: location(),
            })
            .expect("pubkey after reload");
        assert_eq!(pubkey_before, pubkey_after, "same key after reload");
        let sig_after = DashEcdsaPrehashSign {
                digest: sighash,
            private_key: location(),
        }
        .execute(&client)
        .expect("sign after reload");
        k256_verify(&pubkey_after, &sighash, &sig_after);
        k256_verify(&pubkey_after, &sighash, &sig_before);
    }

    // Wrong key must fail to unlock.
    {
        let sh = Stronghold::default();
        let result =
            sh.load_client_from_snapshot(b"spike-client", &snapshot_key(0xEE), &snapshot_path);
        assert!(result.is_err(), "wrong snapshot key must be rejected");
    }
}
