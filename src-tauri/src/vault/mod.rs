// src-tauri/src/vault/mod.rs
//
//! Encrypted-at-rest keystore backed by IOTA Stronghold (pure Rust, no FFI).
//!
//! WHY THIS EXISTS
//! ---------------
//! Private identity keys — AND the user's mnemonic — were previously stored
//! as PLAINTEXT JSON in `.safu-{network}.json` under AppData (see
//! `identity/storage.rs`, `utils/store.rs`). Anyone (or any process) that
//! could read the profile directory could exfiltrate every key.
//!
//! DESIGN (locked 2026-09-10, proven by spike `spikes/stronghold`,
//! findings: `docs/spikes/stronghold-keystore.md`):
//!   * Encrypt everything, always. "No password" means no password PROMPT,
//!     never plaintext.
//!   * Snapshot key sourcing order:
//!     first the OS keyring (keyring-rs; Secret Service on Linux) with a
//!     random 32-byte key; on failure, a random 32-byte key in a 0600 file
//!     next to the snapshot (honest obfuscation for headless/minimal
//!     setups; documented).
//!
//!     A user-password KDF tier can be added later in front of the keyring
//!     tier without changing the vault format (KeyProvider semantics are
//!     identical). A password is NEVER required.
//!   * The keystore blob (IPrivateKeyStore JSON, incl. mnemonic) lives in
//!     the Stronghold CLIENT STORE (key/value, persisted inside the
//!     encrypted snapshot). In-memory it is a plain buffer — identical
//!     exposure to the status quo at runtime; the eliminated risk is the
//!     ON-DISK plaintext. Phase 2 (documented, not yet wired): per-key
//!     guarded vault secrets + in-vault signing via `procedures::
//!     DashEcdsaPrehashSign` once transition building moves Rust-side.
//!   * `VaultStore` implements the existing `PersistentStore` trait and
//!     ROUTES: safu files -> vault; every other file -> the legacy
//!     StoreManager. All keystore/mnemonic logic functions keep working
//!     unchanged (1:1 logic parity, zero frontend changes).
//!   * Legacy plaintext `.safu-{network}.json` files are migrated lazily on
//!     first access, then SHREDDED (best-effort overwrite + remove).
//!
//! DEPENDENCY PIN: iota_stronghold is pinned EXACTLY ("=2.1.0") because
//! the engine is dormant (last release 2024-05-13 per crates.io). Revisit
//! on upgrades; run cargo-audit in CI.

use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex, MutexGuard};

use iota_stronghold::{KeyProvider, SnapshotPath, Stronghold};
use tauri::{AppHandle, Manager, Runtime};
use zeroize::{Zeroize, Zeroizing};

use crate::constants::{SAFU_MAINNET_FILE, SAFU_TESTNET_FILE};
use crate::utils::{PersistentStore, StoreError, StoreManager};

pub mod procedures;

#[cfg(test)]
pub mod tests;

/// Client path inside the Stronghold instance (single client is enough:
/// the store namespace already separates files/keys).
const CLIENT_PATH: &[u8] = b"evonext-keystore";

/// Subdirectory (under AppData) holding the snapshot + fallback key file.
const VAULT_DIR: &str = "vault";
const SNAPSHOT_FILE: &str = "keystore.snapshot";
const FALLBACK_KEY_FILE: &str = "snapshot.key";

/// OS-keyring coordinates for the random snapshot key.
const KEYRING_SERVICE: &str = "app.evonext.desktop";
const KEYRING_ENTRY: &str = "keystore-snapshot-key";

/// Only these files are routed into the vault; everything else keeps using
/// the legacy plaintext StoreManager (public data: identity map, assets,
/// discovered identities — no secrets).
pub fn is_safu_file(file_path: &str) -> bool {
    file_path == SAFU_MAINNET_FILE || file_path == SAFU_TESTNET_FILE
}

/// Store key under which the whole keystore blob is kept (mirrors the
/// legacy layout: one JSON document under the "keystore" key).
const KEYSTORE_KEY: &str = "keystore";

// ===========================================================================
// Snapshot key provisioning
// ===========================================================================

/// Where the snapshot key came from (logged for diagnostics; the fallback
/// tier is reported honestly at startup).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KeyOrigin {
    /// Random 32-byte key held by the OS credential store.
    Keyring,
    /// Random 32-byte key in a 0600 file next to the snapshot.
    FallbackFile,
}

fn key_provider_from(raw: [u8; 32]) -> Result<KeyProvider, String> {
    KeyProvider::try_from(Zeroizing::new(raw.to_vec()))
        .map_err(|e| format!("failed to build snapshot KeyProvider: {e}"))
}

/// Try the OS keyring. Returns None on ANY failure (no secret service,
/// headless session, permission error) so the caller can fall back to the
/// 0600 file. A corrupt (undecodable) existing entry is NOT overwritten —
/// regenerating would orphan an existing snapshot; we fail soft instead.
fn key_from_keyring() -> Option<[u8; 32]> {
    use base64::Engine;
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ENTRY).ok()?;
    match entry.get_password() {
        Ok(b64) => {
            let raw = base64::engine::general_purpose::STANDARD
                .decode(b64.trim())
                .ok()?;
            // Wrong length = corruption: refuse rather than rotate.
            <[u8; 32]>::try_from(raw.as_slice()).ok()
        }
        Err(_) => {
            let mut key = [0u8; 32];
            rand::RngCore::fill_bytes(&mut rand::rng(), &mut key);
            let b64 = base64::engine::general_purpose::STANDARD.encode(key);
            match entry.set_password(&b64) {
                Ok(()) => Some(key),
                Err(_) => {
                    key.zeroize();
                    None
                }
            }
        }
    }
}

/// 0600-file fallback (headless / no Secret Service). An existing file with
/// the wrong length is treated as corruption and refused (same rationale as
/// the keyring path).
fn key_from_file(path: &Path) -> Result<[u8; 32], String> {
    if path.exists() {
        let raw = fs::read(path).map_err(|e| format!("failed to read snapshot key file: {e}"))?;
        return <[u8; 32]>::try_from(raw.as_slice())
            .map_err(|_| "snapshot key file is corrupt (expected 32 bytes)".to_string());
    }
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("failed to create vault dir: {e}"))?;
    }
    let mut key = [0u8; 32];
    rand::RngCore::fill_bytes(&mut rand::rng(), &mut key);
    {
        use std::io::Write;
        let mut opts = fs::OpenOptions::new();
        opts.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            opts.mode(0o600);
        }
        let mut f = opts
            .open(path)
            .map_err(|e| format!("failed to create snapshot key file: {e}"))?;
        f.write_all(&key)
            .map_err(|e| format!("failed to write snapshot key file: {e}"))?;
        f.sync_all().ok();
    }
    Ok(key)
}

/// Provision the snapshot key: OS keyring first, 0600-file fallback.
pub fn provision_snapshot_key<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<(KeyProvider, KeyOrigin), String> {
    if let Some(raw) = key_from_keyring() {
        let kp = key_provider_from(raw)?;
        return Ok((kp, KeyOrigin::Keyring));
    }
    let key_path = app
        .path()
        .resolve(
            format!("{VAULT_DIR}/{FALLBACK_KEY_FILE}"),
            tauri::path::BaseDirectory::AppData,
        )
        .map_err(|e| format!("failed to resolve vault key path: {e}"))?;
    let raw = key_from_file(&key_path)?;
    let kp = key_provider_from(raw)?;
    Ok((kp, KeyOrigin::FallbackFile))
}

// ===========================================================================
// Vault core (path-parameterized: unit-testable without an AppHandle)
// ===========================================================================

pub struct Vault {
    stronghold: Stronghold,
    client: iota_stronghold::Client,
    snapshot_path: SnapshotPath,
    key_provider: KeyProvider,
    #[allow(dead_code)] // surfaced for diagnostics/tests
    pub key_origin: KeyOrigin,
}

impl Vault {
    /// Open (or initialize) a vault rooted at `vault_dir`. If a snapshot
    /// already exists it is decrypted with `key_provider`; otherwise a fresh
    /// client is created and persisted on the first save.
    pub fn open_at(
        vault_dir: &Path,
        key_provider: KeyProvider,
        key_origin: KeyOrigin,
    ) -> Result<Self, String> {
        // Lower the Stronghold snapshot-encryption scrypt work factor BEFORE
        // any snapshot load/commit. See the rationale in `init_vault_state`;
        // this placement guarantees it applies for direct `Vault::open_at`
        // callers (unit tests) too, not just the app `init_vault_state` path.
        match iota_stronghold::engine::snapshot::try_set_encrypt_work_factor(12) {
            Ok(()) => {}
            Err(e) => {
                eprintln!(
                    "[Vault] WARN: could not lower snapshot work factor (using default 19): {:?}",
                    e
                );
            }
        }
        fs::create_dir_all(vault_dir).map_err(|e| format!("failed to create vault dir: {e}"))?;
        let snapshot_path = SnapshotPath::from_path(vault_dir.join(SNAPSHOT_FILE));
        let stronghold = Stronghold::default();
        let client = if snapshot_path.as_path().exists() {
            stronghold
                .load_client_from_snapshot(CLIENT_PATH, &key_provider, &snapshot_path)
                .map_err(|e| format!("failed to open encrypted keystore snapshot: {e}"))?
        } else {
            stronghold
                .create_client(CLIENT_PATH)
                .map_err(|e| format!("failed to create vault client: {e}"))?
        };
        Ok(Self {
            stronghold,
            client,
            snapshot_path,
            key_provider,
            key_origin,
        })
    }

    /// Open the app-scoped vault (AppData/vault, provisioned key).
    pub fn open<R: Runtime>(app: &AppHandle<R>) -> Result<Self, String> {
        let vault_dir = app
            .path()
            .resolve(VAULT_DIR, tauri::path::BaseDirectory::AppData)
            .map_err(|e| format!("failed to resolve vault dir: {e}"))?;
        let (key_provider, origin) = provision_snapshot_key(app)?;
        let vault = Self::open_at(&vault_dir, key_provider, origin)?;
        println!("[Vault] keystore snapshot ready (key origin: {:?})", origin);
        Ok(vault)
    }

    fn store_key(file_path: &str, key: &str) -> Vec<u8> {
        format!("{file_path}::{key}").into_bytes()
    }

    fn commit(&self) -> Result<(), String> {
        self.stronghold
            .commit_with_keyprovider(&self.snapshot_path, &self.key_provider)
            .map_err(|e| format!("failed to commit encrypted keystore snapshot: {e}"))
    }

    pub fn load_blob(&self, file_path: &str, key: &str) -> Result<Option<Vec<u8>>, String> {
        self.client
            .store()
            .get(&Self::store_key(file_path, key))
            .map_err(|e| format!("vault read failed: {e}"))
    }

    pub fn save_blob(&self, file_path: &str, key: &str, bytes: &[u8]) -> Result<(), String> {
        self.client
            .store()
            .insert(Self::store_key(file_path, key), bytes.to_vec(), None)
            .map_err(|e| format!("vault write failed: {e}"))?;
        self.commit()
    }

    pub fn delete_blob(&self, file_path: &str, key: &str) -> Result<(), String> {
        self.client
            .store()
            .delete(&Self::store_key(file_path, key))
            .map_err(|e| format!("vault delete failed: {e}"))?;
        self.commit()
    }

    /// Access to the client for vault procedures (phase-2 in-vault signing).
    #[allow(dead_code)]
    pub fn client(&self) -> &iota_stronghold::Client {
        &self.client
    }
}

// ===========================================================================
// Managed state (same degrade-gracefully pattern as `history`)
// ===========================================================================

/// Managed vault state. `None` = vault failed to initialize (e.g. AppData
/// not writable); commands then return an explicit error instead of ever
/// falling back to plaintext secret storage.
#[derive(Clone)]
pub struct VaultState(pub Arc<Mutex<Option<Vault>>>);

impl VaultState {
    /// Poison-safe lock (mirrors HistoryState): a panicked command must not
    /// permanently wedge the keystore.
    pub fn lock(&self) -> MutexGuard<'_, Option<Vault>> {
        self.0.lock().unwrap_or_else(|e| e.into_inner())
    }
}

/// Initialize + manage the vault at startup. NEVER fails app startup: on
/// error the state holds `None` and keystore commands surface the error.
pub fn init_vault_state<R: Runtime>(handle: &AppHandle<R>) {
    // Lower the Stronghold snapshot-encryption scrypt work factor from the
    // upstream default (19 => N=2^19, ~512 MiB working set, ~60-160s per
    // commit on modest hardware) to a value appropriate for our threat
    // model. Upstream defaults target *human passwords* (the age format
    // uses scrypt to derive a wrap key from the passphrase); our snapshot
    // key is a random 256-bit key provisioned by the OS keyring (or a
    // 0600 fallback file), so the scrypt step only stretches an
    // already-strong key and the upstream "too small (<15)" warning does
    // not apply (it assumes a low-entropy password).
    //
    // Work factor 12 (N=2^12 = 4096, r=8, p=1, ~32 MiB working set) yields
    // ~1s commits while keeping meaningful KDF cost on the snapshot file
    // at rest. The actual `try_set_encrypt_work_factor(12)` call lives in
    // `Vault::open_at` so it also covers direct unit-test callers that
    // construct a `Vault` without going through `init_vault_state`.
    //
    // NOTE: lowering this does NOT weaken the snapshot key itself (still
    // 32 random bytes from the keyring); it only reduces the per-commit
    // scrypt cost of encrypting the snapshot file at rest. See:
    //   - iota-crypto::keys::age::WorkFactor (keys/age.rs)
    //   - stronghold_engine::snapshot::try_set_encrypt_work_factor
    let state = match Vault::open(handle) {
        Ok(v) => VaultState(Arc::new(Mutex::new(Some(v)))),
        Err(e) => {
            eprintln!("[Vault] FATAL: encrypted keystore unavailable: {e}");
            VaultState(Arc::new(Mutex::new(None)))
        }
    };
    handle.manage(state);
}

// ===========================================================================
// Legacy migration + shredding
// ===========================================================================

/// Best-effort secure delete: overwrite with random bytes (capped), fsync,
/// remove. On SSDs/CoW filesystems the old bytes may persist in unmapped
/// blocks — documented limitation; the important property is that the file
/// no longer exists at its well-known path.
pub fn shred_file(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }
    const MAX_OVERWRITE: u64 = 4 * 1024 * 1024; // 4 MiB cap
    let len = fs::metadata(path)
        .map_err(|e| format!("stat failed for {}: {e}", path.display()))?
        .len()
        .min(MAX_OVERWRITE) as usize;
    {
        use std::io::Write;
        let mut buf = vec![0u8; len.max(1)];
        rand::RngCore::fill_bytes(&mut rand::rng(), &mut buf);
        let mut f = fs::OpenOptions::new()
            .write(true)
            .open(path)
            .map_err(|e| format!("open for shred failed for {}: {e}", path.display()))?;
        f.write_all(&buf)
            .map_err(|e| format!("shred overwrite failed for {}: {e}", path.display()))?;
        f.sync_all().ok();
    }
    fs::remove_file(path).map_err(|e| format!("remove failed for {}: {e}", path.display()))?;
    println!("[Vault] shredded legacy plaintext file: {}", path.display());
    Ok(())
}

/// Migration core (path-parameterized: unit-testable without an AppHandle).
/// Moves a legacy plaintext keystore value into the vault, then shreds the
/// legacy file. Idempotent: if the vault already holds the blob we only
/// shred any leftover legacy file.
fn migrate_safu_value(
    vault: &Vault,
    file_path: &str,
    legacy_value: Option<serde_json::Value>,
    legacy_path: &Path,
) -> Result<(), StoreError> {
    if let Some(value) = legacy_value {
        if vault
            .load_blob(file_path, KEYSTORE_KEY)
            .map_err(StoreError::Store)?
            .is_none()
        {
            let bytes = serde_json::to_vec(&value)?;
            vault
                .save_blob(file_path, KEYSTORE_KEY, &bytes)
                .map_err(StoreError::Store)?;
            println!(
                "[Vault] migrated legacy plaintext keystore ({file_path}) into encrypted snapshot"
            );
        }
    }
    if legacy_path.exists() {
        shred_file(legacy_path).map_err(StoreError::Store)?;
    }
    Ok(())
}

/// AppHandle plumbing around `migrate_safu_value`: read the legacy plaintext
/// value via the legacy manager, resolve the on-disk path, run the core.
fn migrate_legacy_safu<R: Runtime>(
    app: &AppHandle<R>,
    vault: &Vault,
    legacy: &StoreManager<R>,
    file_path: &str,
) -> Result<(), StoreError> {
    if !is_safu_file(file_path) {
        return Ok(());
    }
    let legacy_value = legacy.load_value(file_path, KEYSTORE_KEY)?;
    let legacy_path = app
        .path()
        .resolve(file_path, tauri::path::BaseDirectory::AppData)
        .map_err(|e| StoreError::InvalidPath(e.to_string()))?;
    migrate_safu_value(vault, file_path, legacy_value, &legacy_path)
}

// ===========================================================================
// VaultStore: PersistentStore router (safu -> vault, else -> legacy manager)
// ===========================================================================

pub struct VaultStore<'a, R: Runtime> {
    app: &'a AppHandle<R>,
    legacy: StoreManager<'a, R>,
}

impl<'a, R: Runtime> VaultStore<'a, R> {
    pub fn new(app: &'a AppHandle<R>) -> Self {
        Self {
            app,
            legacy: StoreManager::new(app),
        }
    }

    fn with_vault<T>(
        &self,
        f: impl FnOnce(&Vault) -> Result<T, StoreError>,
    ) -> Result<T, StoreError> {
        let state = self
            .app
            .try_state::<VaultState>()
            .ok_or_else(|| StoreError::Store("vault state not managed".to_string()))?;
        let guard = state.lock();
        let vault = guard
            .as_ref()
            .ok_or_else(|| StoreError::Store("encrypted keystore unavailable".to_string()))?;
        f(vault)
    }
}

impl<'a, R: Runtime> PersistentStore for VaultStore<'a, R> {
    fn load_value(
        &self,
        file_path: &str,
        key: &str,
    ) -> Result<Option<serde_json::Value>, StoreError> {
        if !is_safu_file(file_path) {
            return self.legacy.load_value(file_path, key);
        }
        self.with_vault(|vault| {
            if key == KEYSTORE_KEY {
                migrate_legacy_safu(self.app, vault, &self.legacy, file_path)?;
            }
            match vault.load_blob(file_path, key).map_err(StoreError::Store)? {
                Some(bytes) => Ok(Some(serde_json::from_slice(&bytes)?)),
                None => Ok(None),
            }
        })
    }

    fn save_value(
        &self,
        file_path: &str,
        key: &str,
        value: serde_json::Value,
    ) -> Result<(), StoreError> {
        if !is_safu_file(file_path) {
            return self.legacy.save_value(file_path, key, value);
        }
        self.with_vault(|vault| {
            let bytes = serde_json::to_vec(&value)?;
            vault
                .save_blob(file_path, key, &bytes)
                .map_err(StoreError::Store)?;
            // Belt-and-suspenders: never leave a plaintext twin behind.
            let legacy_path = self
                .app
                .path()
                .resolve(file_path, tauri::path::BaseDirectory::AppData)
                .map_err(|e| StoreError::InvalidPath(e.to_string()))?;
            if legacy_path.exists() {
                shred_file(&legacy_path).map_err(StoreError::Store)?;
            }
            Ok(())
        })
    }

    fn delete_value(&self, file_path: &str, key: &str) -> Result<(), StoreError> {
        if !is_safu_file(file_path) {
            return self.legacy.delete_value(file_path, key);
        }
        self.with_vault(|vault| {
            vault
                .delete_blob(file_path, key)
                .map_err(StoreError::Store)?;
            let legacy_path = self
                .app
                .path()
                .resolve(file_path, tauri::path::BaseDirectory::AppData)
                .map_err(|e| StoreError::InvalidPath(e.to_string()))?;
            if legacy_path.exists() {
                shred_file(&legacy_path).map_err(StoreError::Store)?;
            }
            Ok(())
        })
    }
}

// Re-export for call sites that build Locations for vault procedures.
#[allow(unused_imports)]
pub use iota_stronghold::Location as VaultLocation;
