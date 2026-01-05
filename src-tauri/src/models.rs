// src-tauri/src/models.rs

use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IAppSettings {
    pub network: String,
    pub theme: String,
    pub notifications: NotificationSettings,
    pub profile: ProfileSettings,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IAssets {
    pub identity_id: String,
    pub name: String,
    pub symbol: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ILicense {
    pub license_id: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IMnemonic {
    pub seed_phrase: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PrivateKeyEntry {
    pub identity_id: String,
    pub key_id: u32,
    pub purpose: u32,
    pub security_level: u32,
    pub key_type: String,
    pub private_key: String,
    pub public_key: String,
    pub derived_from_mnemonic: Option<bool>,
    pub created_at: String,
    pub last_used: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct PrivateKeyStore {
    pub mnemonic: Option<IMnemonic>,
    pub identities: HashMap<String, Vec<PrivateKeyEntry>>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
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
#[serde(rename_all = "camelCase")]
pub struct IdentityPublicKey {
    pub id: u32,
    #[serde(rename = "type")]
    pub type_: String,
    pub purpose: u32,
    pub security_level: u32,
    pub data: String,
    pub read_only: bool,
    pub disabled_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    pub messages: bool,
    pub mentions: bool,
    pub contact_requests: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSettings {
    pub display_name: String,
    pub username: String,
    pub bio: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredIdentity {
    pub identity_id: String,
    pub identity_idx: u32,
    pub dpns_username: Option<String>,
    pub balance: Option<String>,
    pub key_type: String,
    pub discovered_key: Option<String>,
    pub discovered_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredIdentitiesStore {
    pub identities: HashMap<String, DiscoveredIdentity>,
    pub last_scan: Option<String>,
}
