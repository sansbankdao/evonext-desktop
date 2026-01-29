// src-tauri/src/models/IdentityData.rs

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

// #[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[derive(Serialize, Deserialize, Clone, Type, Debug)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../src/types/rust/")]
pub struct IdentityData {
    pub username: Option<String>,
    pub identity_id: String,
    pub identity_idx: Option<u32>,
    pub dpns_username: Option<String>,
    pub balance: Option<String>,
    pub revision: Option<u64>,

    #[ts(type = "unknown[]")]
    pub public_keys: Option<Vec<serde_json::Value>>, // tolerant; normalized here
    pub created_at: Option<String>,
}
