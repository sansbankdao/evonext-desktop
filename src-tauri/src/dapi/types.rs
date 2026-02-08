// src-tauri/src/dapi/types.rs

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt::{Debug, Formatter};
use thiserror::Error;

#[cfg(test)]
mod tests;

#[derive(Error, Debug)]
pub enum DAPIError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(String),
    #[error("DAPI request failed: {0}")]
    APIFailed(String),
    #[error("Invalid method: {0}")]
    InvalidMethod(String),
    #[error("Unknown DAPI method: {0}")]
    UnknownMethod(String),
    #[error("Missing required parameter: {0}")]
    MissingParameter(String),
    #[error("Invalid parameter type for {0}: expected {1}, got {2}")]
    InvalidParameterType(String, String, String),
    #[error("JSON serialization/deserialization error: {0}")]
    SerializationError(String),
    #[error("Deserialization error: {0}")]
    DeserializationError(String),
    #[error("Network not specified")]
    NetworkNotSpecified,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DAPIRequest {
    pub method: String,
    #[serde(default)]
    pub params: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network: Option<String>,
}

impl Debug for DAPIRequest {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("DAPIRequest")
            .field("method", &self.method)
            .field("network", &self.network)
            .field("params_type", &self.params.to_string())
            .finish()
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DAPIResponse {
    pub success: bool,
    pub method: String,
    #[serde(default)]
    pub params: Vec<Value>,
    pub network: String,
    #[serde(default)]
    pub result: Value,
}

impl DAPIResponse {
    pub fn into_result<T>(self) -> Result<Vec<T>, DAPIError>
    where
        T: for<'de> Deserialize<'de> + Debug,
    {
        if !self.success {
            return Err(DAPIError::APIFailed(self.method));
        }
        match self.result {
            Value::Array(arr) => {
                let mut items = Vec::new();
                for item in arr {
                    items.push(serde_json::from_value(item).map_err(|e| DAPIError::DeserializationError(e.to_string()))?);
                }
                Ok(items)
            }
            Value::Object(_) => Ok(vec![serde_json::from_value(self.result).map_err(|e| DAPIError::DeserializationError(e.to_string()))?]),
            Value::Null => Ok(Vec::new()),
            _ => Ok(Vec::new()),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Network {
    Mainnet,
    Testnet,
}

impl Network {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "mainnet" => Some(Network::Mainnet),
            "testnet" => Some(Network::Testnet),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Network::Mainnet => "mainnet",
            Network::Testnet => "testnet",
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TokenContractInfo {
    pub contract_id: String,
    pub owner_id: String,
    pub name: String,
    pub symbol: String,
    pub total_supply: u64,
    pub decimals: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Identity {
    pub id: String,
    #[serde(default)]
    pub public_keys: Vec<IdentityPublicKey>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub balance: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revision: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct IdentityPublicKey {
    pub id: u32,
    #[serde(rename = "type")]
    pub key_type: u32,
    pub purpose: u32,
    pub security_level: u32,
    pub data: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data_bytes: Option<String>,
    pub read_only: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled_at: Option<String>,
}
