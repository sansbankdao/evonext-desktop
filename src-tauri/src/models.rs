// src-tauri/src/models.rs
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct IAppSettings {
    pub network: String,
    pub theme: String,
    pub notifications: NotificationSettings,
    pub profile: ProfileSettings,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct IAssets {
    pub identity_id: String,
    pub name: String,
    pub symbol: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ILicense {
    pub license_id: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct IMnemonic {
    pub seed_phrase: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct IPrivateKeys {
    pub identity_id: String,
    pub auth_key: String,
    pub encryption_key: String,
    pub transfer_key: String,
}

// -----------------------------------------------------------------------------

#[derive(Serialize, Deserialize, Clone)]
pub struct IdentityData {
    pub username: String,
    pub identity_id: String,
    pub identity_idx: u8,
    pub balance: Option<String>,
    pub is_authenticated: bool,
    // Add new fields for SDK identity details
    pub public_keys: Option<Vec<IdentityPublicKey>>,
    pub revision: Option<u64>,
    pub created_at: Option<String>,
    pub public_key_ids: Option<Vec<u32>>, // This is the INDEX values you mentioned
}

#[derive(Serialize, Deserialize, Clone)]
pub struct IdentityPublicKey {
    pub id: u32, // This is the INDEX you wanted to save
    pub type_: String,
    pub purpose: u32,
    pub security_level: u32,
    pub data: String, // Public key data (hex or base64)
    pub read_only: bool,
    pub disabled_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct NotificationSettings {
    pub messages: bool,
    pub mentions: bool,
    pub contact_requests: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ProfileSettings {
    pub display_name: String,
    pub username: String,
    pub bio: String,
}
