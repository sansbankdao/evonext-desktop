// src-tauri/src/dapi/types.rs

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt::{Debug};
use thiserror::Error;
use specta::Type;

#[cfg(test)]
mod tests;

#[derive(Error, Debug)]
pub enum DAPIError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(String),
    #[error("DAPI request failed: {0}")]
    APIFailed(String),
    #[error("Deserialization error: {0}")]
    DeserializationError(String),
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
}

#[derive(Debug, Serialize, Deserialize, Clone, Type)]
#[serde(rename_all = "camelCase")]
pub struct TokenContractInfo {
    pub contract_id: String,
    pub owner_id: String,
    pub name: String,
    pub symbol: String,
    // FIX: Changed to String to avoid BigIntForbidden
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
    // FIX: Changed to String to avoid BigIntForbidden
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
    pub key_type: u32,
    pub purpose: u32,
    pub security_level: u32,
    pub data: String,
    pub read_only: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub disabled_at: Option<String>,
}
