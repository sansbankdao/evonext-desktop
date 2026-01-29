// src-tauri/src/types/rust/CustomTypes.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use ts_rs::TS;

#[derive(Serialize, Deserialize, Clone, Debug, TS)]
#[serde(rename_all = "camelCase")]
#[ts(export, export_to = "../src/types/rust/")]
pub struct SafeBalance {
    #[serde(skip_serializing_if = "true")]
    pub balance: String,
}
