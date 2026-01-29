// src-tauri/src/identity/mod.rs

pub mod lib;
pub mod storage;

// NOTE: Re-export commonly used types to offer cleaner imports elsewhere.
pub use lib::{normalize_public_key, derive_compressed_pubkey_hex_from_wif, hash160_bytes};
pub use storage::{load_identity_map, save_identity_map, load_keystore, save_keystore};
