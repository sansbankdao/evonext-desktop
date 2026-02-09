// src-tauri/src/dapi/client/methods/system.rs

use super::super::DAPIClient;
use crate::dapi::types::{DAPIError, Network};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;

#[cfg(test)]
mod tests;

impl DAPIClient {
    /// Get platform status
    pub async fn get_platform_status(&self, network: Network) -> Result<Vec<Value>, DAPIError> {
        let params = vec![];
        self.request("get_status".to_string(), params, network)
            .await
    }

    /// Get current epoch info
    pub async fn get_current_epoch(
        &self,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = "get_current_epoch".to_string();
        let params = vec![];
        self.request(method, params, network).await
    }

    /// Get epoch info for a range
    pub async fn get_epochs_info(
        &self,
        start_epoch: Option<String>,
        count: Option<u32>,
        ascending: Option<bool>,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = "get_epochs_info".to_string();
        let mut params = vec![];

        params.push(
            start_epoch
                .and_then(|s| s.parse::<i64>().ok())
                .map(|n| Value::Number(n.into()))
                .unwrap_or(Value::Null),
        );
        params.push(
            count
                .map(|c| Value::Number(c.into()))
                .unwrap_or(Value::Null),
        );
        params.push(ascending.map(Value::Bool).unwrap_or(Value::Null));

        self.request(method, params, network).await
    }

    /// Get finalized epoch infos
    pub async fn get_finalized_epoch_infos(
        &self,
        start_epoch: Option<String>,
        count: Option<u32>,
        ascending: Option<bool>,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = "get_finalized_epoch_infos".to_string();
        let mut params = vec![];

        params.push(
            start_epoch
                .and_then(|s| s.parse::<i64>().ok())
                .map(|n| Value::Number(n.into()))
                .unwrap_or(Value::Null),
        );
        params.push(
            count
                .map(|c| Value::Number(c.into()))
                .unwrap_or(Value::Null),
        );
        params.push(ascending.map(Value::Bool).unwrap_or(Value::Null));

        self.request(method, params, network).await
    }

    /// Get total credits in platform
    pub async fn get_total_credits_in_platform(
        &self,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        self.request("get_total_credits_in_platform".to_string(), vec![], network).await
    }

    /// Get vote polls by end date
    pub async fn get_vote_polls_by_end_date(
        &self,
        end_time_ms: Option<String>,
        limit: Option<u32>,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = "get_vote_polls_by_end_date".to_string();
        let mut params = vec![];

        params.push(
            end_time_ms
                .and_then(|e| e.parse::<i64>().ok())
                .map(|n| Value::Number(n.into()))
                .unwrap_or(Value::Null),
        );
        params.push(
            limit
                .map(|l| Value::Number(l.into()))
                .unwrap_or(Value::Null),
        );

        self.request(method, params, network).await
    }

    /// Get current chain height
    pub async fn get_current_chain_height(
        &self,
        network: Network,
    ) -> Result<Option<String>, DAPIError> {
        let status = self.get_platform_status(network).await?;
        for item in status {
            if let Some(height) = item.get("chainHeight").and_then(|v| v.as_i64()) {
                return Ok(Some(height.to_string()));
            }
        }
        Ok(None)
    }

    /// Get epoch info with formatted data
    pub async fn get_formatted_epoch_info(
        &self,
        network: Network,
    ) -> Result<Option<EpochInfo>, DAPIError> {
        let epochs = self.get_current_epoch(network).await?;
        for epoch_data in epochs {
            if let Some(raw_epoch) = epoch_data.get("epoch") {
                if let Ok(epoch) = serde_json::from_value::<EpochInfo>(raw_epoch.clone()) {
                    return Ok(Some(epoch));
                }
            }
        }
        Ok(None)
    }
}

#[derive(Debug, Deserialize, Serialize, Type, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EpochInfo {
    #[serde(deserialize_with = "de_str_from_num_or_str")]
    pub index: String,
    #[serde(deserialize_with = "de_str_from_num_or_str")]
    pub start_height: String,
    #[serde(deserialize_with = "de_str_from_num_or_str")]
    pub end_height: String,
    #[serde(deserialize_with = "de_str_from_num_or_str")]
    pub first_block_height: String,
    #[serde(deserialize_with = "de_str_from_num_or_str")]
    pub first_core_block_height: String,
    #[serde(deserialize_with = "de_str_from_num_or_str")]
    pub start_time: String,
}

impl EpochInfo {
    pub fn current_height_within_epoch(&self, current_height_str: &str) -> u128 {
        let current = current_height_str.parse::<u128>().unwrap_or(0);
        let start = self.start_height.parse::<u128>().unwrap_or(0);
        let end = self.end_height.parse::<u128>().unwrap_or(0);

        if current >= start && current <= end {
            current - start
        } else {
            0
        }
    }

    pub fn epoch_progress(&self, current_height_str: &str) -> f64 {
        let start = self.start_height.parse::<u128>().unwrap_or(0);
        let end = self.end_height.parse::<u128>().unwrap_or(1);

        if start >= end { return 0.0; }

        let total_blocks = end - start;
        let blocks_passed = self.current_height_within_epoch(current_height_str);

        blocks_passed as f64 / total_blocks as f64
    }

    pub fn to_display_string(&self, current_height_str: &str) -> String {
        let progress = self.epoch_progress(current_height_str);
        let percent = (progress * 100.0) as u32;
        format!("Epoch {} ({}%)", self.index, percent)
    }
}

fn de_str_from_num_or_str<'de, D>(deserializer: D) -> Result<String, D::Error>
where D: serde::Deserializer<'de> {
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StrOrNum { Str(String), Num(i64) } // i64 is safe inside logic
    match StrOrNum::deserialize(deserializer)? {
        StrOrNum::Str(s) => Ok(s),
        StrOrNum::Num(n) => Ok(n.to_string()),
    }
}
