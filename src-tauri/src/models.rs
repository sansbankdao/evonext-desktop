// src-tauri/src/models.rs

use std::collections::HashMap;
use serde::de::{Unexpected};
use serde::{Deserialize, Deserializer, Serialize};
use specta::Type;

#[cfg(test)]
mod tests;

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
    pub messages: bool,
    pub mentions: bool,
    pub contact_requests: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct IProfileSettings {
    pub display_name: String,
    pub username: String,
    pub bio: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type)]
#[serde(rename_all = "camelCase")]
pub struct IAppSettings {
    pub network: String,
    pub theme: String,
    pub notifications: INotificationSettings,
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
    pub balance: Option<String>,
    #[serde(default, rename = "assetId")]
    pub asset_id: Option<String>,
    pub decimals: Option<u8>,
    pub network: Option<String>,
}

pub type IAssets = Vec<IAssetDefinition>;
pub type IAssetStoreMap = HashMap<String, Vec<IAssetDefinition>>;

// =====================================================
// Helper Deserializers
// =====================================================

fn de_u32_from_str_or_num<'de, D>(deserializer: D) -> Result<u32, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum NumOrStr {
        Num(u32),
        Str(String),
        Null,
    }
    match NumOrStr::deserialize(deserializer)? {
        NumOrStr::Num(n) => Ok(n),
        NumOrStr::Str(s) => {
            if s.is_empty() { return Ok(0); }
            s.parse::<u32>().map(Ok).unwrap_or_else(|_| {
                Err(serde::de::Error::invalid_value(Unexpected::Str(&s), &"u32"))
            })
        }
        NumOrStr::Null => Ok(0),
    }
}

// =====================================================
// Keystore & Identity Models
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct IMnemonic { pub seed_phrase: String }

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
    pub created_at: String,
    pub last_used: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct IPrivateKeyStore {
    pub identities: HashMap<String, Vec<IPrivateKeyEntry>>,
    pub mnemonic: Option<IMnemonic>,
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
    pub identity_id: String,
    pub username: String,
    pub balance: String,
    #[serde(default, deserialize_with = "de_u32_from_str_or_num")]
    pub revision: u32,
    pub public_keys: Vec<IIdentityPublicKey>,
    pub identity_idx: Option<u32>,
    pub dpns_username: Option<String>,
    pub is_authenticated: bool,
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
    pub created_at: String,
    pub expires_at: String,
    pub updated_at: Option<String>,
}

pub type ILicenseStoreMap = HashMap<String, ILicense>;

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default)]
#[serde(rename_all = "camelCase")]
pub struct IDiscoveredIdentity {
    pub identity_id: String,
    pub balance: String,
    pub identity_idx: Option<u32>,
    pub dpns_username: Option<String>,
    pub key_type: String,
    pub discovered_at: String,
}
