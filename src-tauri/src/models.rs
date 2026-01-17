// src-tauri/src/models.rs

use serde::{Serialize, Deserialize, Deserializer};
use serde::de::{Error as DeError, Unexpected};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IAppSettings {
    pub network: String,
    pub theme: String,
    #[serde(default)]
    pub notifications: NotificationSettings,
    #[serde(default)]
    pub profile: ProfileSettings,
    pub active_identity_id: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AssetDefinition {
    pub identity_id: String,
    pub name: String,
    pub symbol: String,
    pub balance: Option<u64>,
    #[serde(default, rename = "asset_id")]
    pub asset_id: Option<String>,
    #[serde(default)]
    pub decimals: Option<u8>,
    #[serde(default)]
    pub network: Option<String>,
}

// IAssets is now a type alias for a list of assets
pub type IAssets = Vec<AssetDefinition>;
pub type AssetStoreMap = HashMap<String, Vec<AssetDefinition>>;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ILicense {
    pub success: bool,
    pub identity_id: String,
    pub txid: String,
    pub is_premium: bool,
    pub created_at: i64,
    pub expires_at: i64,
    pub updated_at: Option<i64>,
}

// Map of Identity IDs to their respective License data
pub type LicenseStoreMap = HashMap<String, ILicense>;

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

fn de_u64_from_str_or_num<'de, D>(deserializer: D) -> Result<Option<u64>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum NumOrStr {
        Num(u64),
        Str(String),
        Null,
    }
    match NumOrStr::deserialize(deserializer)? {
        NumOrStr::Num(n) => Ok(Some(n)),
        NumOrStr::Str(s) => {
            if s.is_empty() {
                return Ok(None);
            }
            s.parse::<u64>()
                .map(Some)
                .map_err(|_| D::Error::invalid_value(Unexpected::Str(&s), &"a u64 or stringified u64"))
        }
        NumOrStr::Null => Ok(None),
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct IdentityData {
    pub username: String,
    pub identity_id: String,
    pub identity_idx: u32,
    pub balance: Option<String>,
    pub is_authenticated: bool,
    pub public_keys: Option<Vec<IdentityPublicKey>>,
    #[serde(default, deserialize_with = "de_u64_from_str_or_num")]
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

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    #[serde(default)]
    pub messages: bool,
    #[serde(default)]
    pub mentions: bool,
    #[serde(default)]
    pub contact_requests: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ProfileSettings {
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
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
