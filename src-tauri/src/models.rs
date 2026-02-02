// src-tauri/src/models.rs

use std::collections::HashMap;
use serde::de::{Error as DeError, Unexpected};
use serde::{Deserialize, Deserializer, Serialize};
use specta::Type;

// =====================================================
// Custom Types & Wrappers
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct IAnyValue(pub serde_json::Value);

impl ::specta::Type for IAnyValue {
    fn inline(_types: &mut ::specta::TypeMap, _generics: ::specta::Generics) -> ::specta::datatype::DataType {
        ::specta::datatype::DataType::Any
    }
}

// =====================================================
// Settings Models
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct INotificationSettings {
    #[serde(default)]
    pub messages: bool,
    #[serde(default)]
    pub mentions: bool,
    #[serde(default)]
    pub contact_requests: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct IProfileSettings {
    #[serde(default)]
    pub display_name: String,
    #[serde(default)]
    pub username: String,
    #[serde(default)]
    pub bio: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type)]
#[serde(rename_all = "camelCase")]
pub struct IAppSettings {
    pub network: String,
    pub theme: String,
    #[serde(default)]
    pub notifications: INotificationSettings,
    #[serde(default)]
    pub profile: IProfileSettings,
    pub active_identity_id: Option<String>,
}

// =====================================================
// Asset Models
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Type)]
#[serde(rename_all = "camelCase")]
pub struct IAssetDefinition {
    pub identity_id: String,
    pub name: String,
    pub symbol: String,
    pub balance: Option<u64>,
    #[serde(default, rename = "assetId")]
    pub asset_id: Option<String>,
    #[serde(default)]
    pub decimals: Option<u8>,
    #[serde(default)]
    pub network: Option<String>,
}

pub type IAssets = Vec<IAssetDefinition>;
pub type IAssetStoreMap = HashMap<String, Vec<IAssetDefinition>>;

// =====================================================
// Keystore & Identity Models
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct IMnemonic {
    pub seed_phrase: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct IPrivateKeyEntry {
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

#[derive(Serialize, Deserialize, Clone, Debug, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct IPrivateKeyStore {
    pub mnemonic: Option<IMnemonic>,
    pub identities: HashMap<String, Vec<IPrivateKeyEntry>>,
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
            if s.is_empty() { return Ok(None); }
            s.parse::<u64>().map(Some).map_err(|_| {
                D::Error::invalid_value(Unexpected::Str(&s), &"a u64 or stringified u64")
            })
        }
        NumOrStr::Null => Ok(None),
    }
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct IIdentityPublicKey {
    pub id: u32,
    #[serde(rename = "type")]
    pub type_: String,
    pub purpose: u32,
    pub security_level: u32,
    pub data: String,
    pub read_only: bool,
    pub disabled_at: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct IIdentityData {
    pub username: String,
    pub identity_id: String,
    pub identity_idx: u32,
    pub dpns_username: Option<String>,
    pub balance: Option<String>,
    pub is_authenticated: bool,
    pub public_keys: Option<Vec<IIdentityPublicKey>>,
    #[serde(default, deserialize_with = "de_u64_from_str_or_num")]
    pub revision: Option<u64>,
    pub created_at: Option<String>,
    pub public_key_ids: Option<Vec<u32>>,
}

// =====================================================
// License & Discovery Results
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
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

pub type ILicenseStoreMap = HashMap<String, ILicense>;

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct IDiscoveredIdentity {
    pub identity_id: String,
    pub identity_idx: u32,
    pub dpns_username: Option<String>,
    pub balance: Option<String>,
    pub key_type: String,
    pub discovered_key: Option<String>,
    pub discovered_at: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Default, Type)]
#[serde(rename_all = "camelCase")]
pub struct IDiscoveredIdentitiesStore {
    pub identities: HashMap<String, IDiscoveredIdentity>,
    pub last_scan: Option<String>,
}
