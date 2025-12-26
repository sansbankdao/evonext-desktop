// src-tauri/src/dapi/client/methods/system.rs

use serde_json::Value;
use serde::Deserialize;
use crate::dapi::types::{DAPIError, Network};
use super::super::DAPIClient;

impl DAPIClient {
    /// Get platform status
    pub async fn get_platform_status(
        &self,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let params = vec![];
        self.request("get_status".to_string(), params, network).await
    }

    /// Get current epoch info
    pub async fn get_current_epoch(
        &self,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_current_epoch_with_proof_info".to_string()
        } else {
            "get_current_epoch".to_string()
        };

        let params = vec![];
        self.request(method, params, network).await
    }

    /// Get epoch info for a range
    pub async fn get_epochs_info(
        &self,
        start_epoch: Option<u64>,
        count: Option<u32>,
        ascending: Option<bool>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_epochs_info_with_proof_info".to_string()
        } else {
            "get_epochs_info".to_string()
        };

        let mut params = vec![];

        // Add optional parameters
        params.push(start_epoch.map(|s| Value::Number(s.into())).unwrap_or(Value::Null));
        params.push(count.map(|c| Value::Number(c.into())).unwrap_or(Value::Null));
        params.push(ascending.map(Value::Bool).unwrap_or(Value::Null));

        self.request(method, params, network).await
    }

    /// Get finalized epoch infos
    pub async fn get_finalized_epoch_infos(
        &self,
        start_epoch: Option<u64>,
        count: Option<u32>,
        ascending: Option<bool>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_finalized_epoch_infos_with_proof_info".to_string()
        } else {
            "get_finalized_epoch_infos".to_string()
        };

        let mut params = vec![];

        // Add optional parameters
        params.push(start_epoch.map(|s| Value::Number(s.into())).unwrap_or(Value::Null));
        params.push(count.map(|c| Value::Number(c.into())).unwrap_or(Value::Null));
        params.push(ascending.map(Value::Bool).unwrap_or(Value::Null));

        self.request(method, params, network).await
    }

    /// Get protocol version upgrade state
    pub async fn get_protocol_version_upgrade_state(
        &self,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_protocol_version_upgrade_state_with_proof_info".to_string()
        } else {
            "get_protocol_version_upgrade_state".to_string()
        };

        let params = vec![];
        self.request(method, params, network).await
    }

    /// Get total credits in platform
    pub async fn get_total_credits_in_platform(
        &self,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_total_credits_in_platform_with_proof_info".to_string()
        } else {
            "get_total_credits_in_platform".to_string()
        };

        let params = vec![];
        self.request(method, params, network).await
    }

    /// Get current quorums info
    pub async fn get_current_quorums_info(
        &self,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let params = vec![];
        self.request("get_current_quorums_info".to_string(), params, network).await
    }

    /// Prefetch trusted quorums for mainnet
    pub async fn prefetch_trusted_quorums_mainnet(
        &self,
    ) -> Result<Vec<Value>, DAPIError> {
        let params = vec![];
        self.request("prefetch_trusted_quorums_mainnet".to_string(), params, Network::Mainnet).await
    }

    /// Prefetch trusted quorums for testnet
    pub async fn prefetch_trusted_quorums_testnet(
        &self,
    ) -> Result<Vec<Value>, DAPIError> {
        let params = vec![];
        self.request("prefetch_trusted_quorums_testnet".to_string(), params, Network::Testnet).await
    }

    /// Get vote polls by end date
    pub async fn get_vote_polls_by_end_date(
        &self,
        end_time_ms: Option<u64>,
        limit: Option<u32>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_vote_polls_by_end_date_with_proof_info".to_string()
        } else {
            "get_vote_polls_by_end_date".to_string()
        };

        let mut params = vec![];

        // Add optional parameters
        params.push(end_time_ms.map(|e| Value::Number(e.into())).unwrap_or(Value::Null));
        params.push(limit.map(|l| Value::Number(l.into())).unwrap_or(Value::Null));

        self.request(method, params, network).await
    }

    /// Check if platform is healthy
    pub async fn check_platform_health(
        &self,
        network: Network,
    ) -> Result<bool, DAPIError> {
        match self.get_platform_status(network).await {
            Ok(status) => {
                // Check if status contains expected fields
                let is_healthy = !status.is_empty() &&
                    status.iter().any(|item|
                        item.get("chainHeight").is_some() ||
                        item.get("version").is_some()
                    );
                Ok(is_healthy)
            }
            Err(_) => Ok(false),
        }
    }

    /// Get platform version
    pub async fn get_platform_version(
        &self,
        network: Network,
    ) -> Result<Option<String>, DAPIError> {
        let status = self.get_platform_status(network).await?;

        for item in status {
            if let Some(version) = item.get("version").and_then(|v| v.as_str()) {
                return Ok(Some(version.to_string()));
            }
        }

        Ok(None)
    }

    /// Get current chain height
    pub async fn get_current_chain_height(
        &self,
        network: Network,
    ) -> Result<Option<u64>, DAPIError> {
        let status = self.get_platform_status(network).await?;

        for item in status {
            if let Some(height) = item.get("chainHeight").and_then(|v| v.as_u64()) {
                return Ok(Some(height));
            }
        }

        Ok(None)
    }

    /// Get epoch info with formatted data
    pub async fn get_formatted_epoch_info(
        &self,
        network: Network,
    ) -> Result<Option<EpochInfo>, DAPIError> {
        let epochs = self.get_current_epoch(network, false).await?;

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

/// Structured epoch information
#[derive(Debug, Deserialize)]
pub struct EpochInfo {
    pub index: u64,
    pub start_height: u64,
    pub end_height: u64,
    pub first_block_height: u64,
    pub first_core_block_height: u64,
    pub start_time: u64,
}

impl EpochInfo {
    /// Calculate current height within epoch
    pub fn current_height_within_epoch(&self, current_height: u64) -> u64 {
        if current_height >= self.start_height && current_height <= self.end_height {
            current_height - self.start_height
        } else {
            0
        }
    }

    /// Calculate progress within epoch (0.0 to 1.0)
    pub fn epoch_progress(&self, current_height: u64) -> f64 {
        if self.start_height >= self.end_height {
            return 0.0;
        }

        let total_blocks = self.end_height - self.start_height;
        let blocks_passed = self.current_height_within_epoch(current_height);

        blocks_passed as f64 / total_blocks as f64
    }

    /// Format as human-readable string
    pub fn to_display_string(&self, current_height: u64) -> String {
        let progress = self.epoch_progress(current_height);
        let percent = (progress * 100.0) as u32;

        format!("Epoch {} ({:.1}%)", self.index, percent)
    }
}
