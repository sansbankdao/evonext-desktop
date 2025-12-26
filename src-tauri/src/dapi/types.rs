// src-tauri/src/dapi/types.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DAPIRequest {
    pub method: String,
    #[serde(default)]
    pub params: HashMap<String, serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DAPIResponse<T = serde_json::Value> {
    pub success: bool,
    pub method: String,
    #[serde(default)]
    pub params: Vec<serde_json::Value>,
    pub network: String,
    #[serde(default)]
    pub result: Vec<T>,
}

#[derive(Debug, thiserror::Error)]
pub enum DAPIError {
    #[error("HTTP request failed: {0}")]
    RequestFailed(String),

    #[error("DAPI request failed: {0}")]
    APIFailed(String),

    #[error("Invalid method: {0}")]
    InvalidMethod(String),

    #[error("Missing required parameter: {0}")]
    MissingParameter(String),

    #[error("Invalid parameter type for {0}: expected {1}, got {2}")]
    InvalidParameterType(String, String, String),

    #[error("JSON serialization error: {0}")]
    SerializationError(String),

    #[error("Network not specified")]
    NetworkNotSpecified,
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

// Common document type for posts
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PostDocument {
    pub owner_id: String,
    pub data_contract_id: String,
    #[serde(rename = "documentTypeName")]
    pub document_type_name: Option<String>,
    pub revision: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at_block_height: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at_block_height: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at_core_block_height: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at_core_block_height: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transferred_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transferred_at_block_height: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transferred_at_core_block_height: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entropy: Option<String>,
    pub content: String,
    pub is_sensitive: bool,
    pub language: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remix: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hashtag: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub media_url: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mention_ids: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reply_to_post_id: Option<Vec<String>>,
}

// Identity types
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

// Token types
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TokenBalance {
    pub token_id: String,
    pub balance: u64,
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
    pub metadata: Option<serde_json::Value>,
}
