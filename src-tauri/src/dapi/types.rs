// src-tauri/src/dapi/types.rs

use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;
use std::fmt::Debug;
use std::str::FromStr;
use thiserror::Error;

#[cfg(test)]
mod tests;

#[derive(Error, Debug)]
pub enum DAPIError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(String),
    #[error("DAPI request failed: {0}")]
    APIFailed(String),
    #[error("Serialization error: {0}")]
    SerializationError(String),
    #[error("Deserialization error: {0}")]
    DeserializationError(String),
    #[error("Unknown method: {0}")]
    UnknownMethod(String),
    #[error("Missing parameter: {0}")]
    MissingParameter(String),
    #[error("Invalid parameter type for {0}: expected {1}, got {2}")]
    InvalidParameterType(String, String, String),
    #[error("Network not specified")]
    NetworkNotSpecified,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DAPIRequest {
    pub method: String,
    #[serde(default)]
    pub params: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network: Option<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
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
        T: for<'de> Deserialize<'de>,
    {
        if self.result.is_null() {
            return Ok(vec![]);
        }

        // 1. Try to parse as Vec<T> (Case A: Result is already an array)
        if self.result.is_array() {
            if let Ok(items) = serde_json::from_value::<Vec<T>>(self.result.clone()) {
                return Ok(items);
            }
        }

        // 2. Try to parse as single T (Case B: Result is an object)
        if let Ok(item) = serde_json::from_value::<T>(self.result) {
            return Ok(vec![item]);
        }

        Err(DAPIError::DeserializationError(
            "Could not parse result into expected type".into(),
        ))
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum Network {
    Mainnet,
    Testnet,
}

impl Network {
    pub fn as_str(&self) -> &'static str {
        match self {
            Network::Mainnet => "mainnet",
            Network::Testnet => "testnet",
        }
    }
    pub fn parse(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "mainnet" => Some(Network::Mainnet),
            "testnet" => Some(Network::Testnet),
            _ => None,
        }
    }
}

impl FromStr for Network {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Network::parse(s).ok_or(())
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct TokenContractInfo {
    pub contract_id: String,
    pub owner_id: String,
    pub name: String,
    pub symbol: String,
    pub total_supply: String,
    pub decimals: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct Identity {
    pub id: String,
    #[serde(default)]
    pub public_keys: Vec<IdentityPublicKey>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub balance: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub revision: Option<u32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdentityPublicKey {
    pub id: u32,
    #[serde(rename = "type")]
    pub key_type: Value, // Changed to Value to handle String or Number
    pub purpose: Value,
    pub security_level: Value,
    pub data: String,
    pub read_only: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled_at: Option<String>,
}
