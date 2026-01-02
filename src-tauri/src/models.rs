// src-tauri/src/models.rs

use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IAppSettings {
    pub network: String,
    pub theme: String,
    pub notifications: NotificationSettings,
    pub profile: ProfileSettings,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IAssets {
    pub identity_id: String,
    pub name: String,
    pub symbol: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ILicense {
    pub license_id: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IMnemonic {
    pub seed_phrase: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PrivateKeyEntry {
    pub identity_id: String,
    pub key_id: u32,           // The public key ID this private key corresponds to
    pub purpose: u32,          // 0=AUTHENTICATION, 1=ENCRYPTION, 2=DECRYPTION, 3=TRANSFER
    pub security_level: u32,   // 0=MASTER, 1=CRITICAL, 2=HIGH, 3=MEDIUM, 4=LOW
    pub key_type: String,      // e.g., "ecdsa", "bls"
    pub private_key: String,   // The private key in WIF or hex format
    pub public_key: String,    // Optional: corresponding public key
    pub derived_from_mnemonic: Option<bool>, // Whether this was derived from a mnemonic
    pub created_at: String,
    pub last_used: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct PrivateKeyStore {
    // Store mnemonic separately
    pub mnemonic: Option<IMnemonic>,
    // Store private keys, keyed by identity_id
    pub identities: HashMap<String, Vec<PrivateKeyEntry>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IdentityData {
    pub username: String,
    pub identity_id: String,
    pub identity_idx: u8,
    pub balance: Option<String>,
    pub is_authenticated: bool,
    pub public_keys: Option<Vec<IdentityPublicKey>>,
    pub revision: Option<u64>,
    pub created_at: Option<String>,
    pub public_key_ids: Option<Vec<u32>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IdentityPublicKey {
    pub id: u32,
    pub type_: String,
    pub purpose: u32,
    pub security_level: u32,
    pub data: String, // Public key data (hex or base64)
    pub read_only: bool,
    pub disabled_at: Option<String>,
}
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NotificationSettings {
    pub messages: bool,
    pub mentions: bool,
    pub contact_requests: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ProfileSettings {
    pub display_name: String,
    pub username: String,
    pub bio: String,
}
