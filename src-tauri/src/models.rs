// src-tauri/src/models.rs

use serde::de::Unexpected;
use serde::{Deserialize, Deserializer, Serialize};
use specta::Type;
use std::collections::HashMap;

#[cfg(test)]
mod tests;

// =====================================================
// Unified Protocol Model (THE SOURCE OF TRUTH)
// =====================================================
#[derive(Serialize, Deserialize, Clone, Debug, Type, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ICommandResult<T: Type> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}
impl<T: Type> ICommandResult<T> {
    pub fn ok(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }
    pub fn err(message: &str) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(message.to_string()),
        }
    }
}
/// Helper macro to convert standard Result to ICommandResult
#[macro_export]
macro_rules! cmd_res {
    ($result:expr) => {
        match $result {
            Ok(data) => $crate::models::ICommandResult::ok(data),
            Err(e) => $crate::models::ICommandResult::err(&e.to_string()),
        }
    };
}
#[derive(Serialize, Deserialize, Clone, Debug, Default, PartialEq)]
pub struct IAnyValue(pub serde_json::Value);

/// JSON value carried across the generic DAPI command surface.
///
/// WHY A NEWTYPE (specta rc.26): specta's built-in `serde_json::Value` impl
/// is a named JSON union containing i64/u64 members, which specta-typescript
/// refuses to export (rc.26 also removed `skip_bigint_checks`), and the
/// derive's `remote` mechanism now emits a literal impl on the remote type,
/// which the orphan rule forbids outside specta itself.
/// `#[serde(transparent)]` keeps the wire format identical to a bare
/// `serde_json::Value`; the manual `Type` impl below reproduces the pre-rc.26
/// `JsonValue` bindings exactly:
///
///   export type JsonValue = null | boolean | number | string | JsonValue[] | Partial<{ [key in string]: JsonValue }>
///
/// JSON numbers map to `number` (f64): the DAPI values carried by these
/// commands are identifiers, counts and timestamps, never exact integers
/// beyond 2^53.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(transparent)]
pub struct JsonValue(pub serde_json::Value);

impl ::specta::Type for JsonValue {
    fn definition(types: &mut ::specta::Types) -> ::specta::datatype::DataType {
        use ::specta::datatype::{DataType, NamedDataType};

        // Memoize: the generic DAPI commands reference JsonValue many times;
        // register the named type only once.
        let mut existing = None;
        types.iter_mut(|ndt| {
            if existing.is_none() && ndt.name == "JsonValue" {
                existing = Some(DataType::Reference(ndt.reference(vec![])));
            }
        });
        if let Some(reference) = existing {
            return reference;
        }

        let ndt = NamedDataType::new("JsonValue", types, |_types, ndt| {
            // An opaque TypeScript reference renders verbatim wherever the
            // named type's body is emitted, giving exactly:
            //   export type JsonValue = null | boolean | number | string | JsonValue[] | Partial<{ [key in string]: JsonValue }>
            // The self-references inside the text resolve against this very
            // export. (Enum/union DataTypes cannot be constructed from
            // outside specta: `Enum` is #[non_exhaustive] with no public
            // constructor, and specta-typescript's untagged-union shape is
            // what the pre-rc.26 bindings were generated with.)
            ndt.ty = Some(DataType::Reference(::specta_typescript::define(
                "null | boolean | number | string | JsonValue[] | Partial<{ [key in string]: JsonValue }>",
            )));
        });
        DataType::Reference(ndt.reference(vec![]))
    }
}

impl From<serde_json::Value> for JsonValue {
    fn from(value: serde_json::Value) -> Self {
        JsonValue(value)
    }
}

impl JsonValue {
    /// Adapter used by the generic DAPI commands to convert the
    /// `Result<Vec<serde_json::Value>, _>` results returned by the DAPI
    /// client into the exported shape.
    pub fn vec_from(values: Vec<serde_json::Value>) -> Vec<JsonValue> {
        values.into_iter().map(JsonValue::from).collect()
    }
}

impl ::specta::Type for IAnyValue {
    // specta rc.26 removed `DataType::Any` (and `TypeMap`/`Generics`); the
    // sanctioned way to keep emitting TS `any` byte-for-byte is an opaque
    // reference whose TypeScript rendering is defined verbatim as "any".
    fn definition(_types: &mut ::specta::Types) -> ::specta::datatype::DataType {
        ::specta::datatype::DataType::Reference(::specta_typescript::define("any"))
    }
}

// =====================================================
// Settings Models
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct INotificationSettings {
    pub messages: bool,
    pub mentions: bool,
    pub contact_requests: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IProfileSettings {
    pub display_name: String,
    pub username: String,
    pub bio: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, PartialEq)]
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

#[derive(Serialize, Deserialize, Clone, Debug, Type, PartialEq)]
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
            if s.is_empty() {
                return Ok(0);
            }
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

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IMnemonic {
    pub seed_phrase: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default, PartialEq)]
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

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IPrivateKeyStore {
    pub identities: HashMap<String, Vec<IPrivateKeyEntry>>,
    pub mnemonic: Option<IMnemonic>,
}

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default, PartialEq)]
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

#[derive(Serialize, Deserialize, Clone, Debug, Default, Type, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IIdentityData {
    pub identity_id: String,
    pub username: String,
    pub balance: String,
    // deserialize_with accepts a string OR number on the wire, but the
    // serialized (and TypeScript-visible) type is a plain number; specta
    // rc.26 requires the wire type to be declared explicitly.
    #[serde(default, deserialize_with = "de_u32_from_str_or_num")]
    #[specta(type = u32)]
    pub revision: u32,
    pub public_keys: Vec<IIdentityPublicKey>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub identity_idx: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub dpns_username: Option<String>,
    pub is_authenticated: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub created_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub public_key_ids: Option<Vec<u32>>,
}

// =====================================================
// License & Discovery Results
// =====================================================

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default, PartialEq)]
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

#[derive(Serialize, Deserialize, Clone, Debug, Type, Default, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct IDiscoveredIdentity {
    pub identity_id: String,
    pub balance: String,
    pub identity_idx: Option<u32>,
    pub dpns_username: Option<String>,
    pub key_type: String,
    pub discovered_at: String,
}
