// src-tauri/src/models/IdentityData.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../src/types/rust/")]
pub struct IdentityData {
    pub username: Option<String>,
    pub identity_id: String,
    pub identity_idx: Option<u32>,
    pub dpns_username: Option<String>,
    pub balance: Option<String>, // <--- CRITICAL: String is needed here
    pub revision: Option<u64>,

    #[ts(type = "unknown[]")]
    pub public_keys: Option<Vec<serde_json::Value>>, // tolerant; normalized here
    pub created_at: Option<String>,
}
