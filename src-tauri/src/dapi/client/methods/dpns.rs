// src-tauri/src/dapi/client/methods/dpns.rs

use super::super::DAPIClient;
use crate::dapi::types::{DAPIError, Network};
use serde_json::Value;

impl DAPIClient {
    /// Resolve a DPNS name to an identity
    pub async fn resolve_dpns_name(
        &self,
        username: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_dpns_username_by_name_with_proof_info".to_string()
        } else {
            "dpns_resolve_name".to_string()
        };

        let params = vec![Value::String(username)];

        self.request(method, params, network).await
    }

    /// Get DPNS username(s) for an identity
    pub async fn get_dpns_username(
        &self,
        identity_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_dpns_usernames_with_proof_info".to_string()
        } else {
            "get_dpns_username".to_string()
        };

        let params = vec![Value::String(identity_id)];

        self.request(method, params, network).await
    }

    /// Get DPNS usernames (plural) for an identity
    pub async fn get_dpns_usernames(
        &self,
        identity_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_dpns_usernames_with_proof_info".to_string()
        } else {
            "get_dpns_usernames".to_string()
        };

        let params = vec![Value::String(identity_id)];

        self.request(method, params, network).await
    }

    /// Search DPNS names with a prefix
    pub async fn search_dpns_names(
        &self,
        prefix: String,
        network: Network,
        limit: Option<u32>,
    ) -> Result<Vec<Value>, DAPIError> {
        // Note: This uses the same endpoint but with a where clause
        let where_clause = Some(serde_json::json!({
            "normalizedParentDomainName": "dash",
            "normalizedLabel": {
                "$startsWith": prefix.to_lowercase()
            }
        }));

        let params = vec![
            // We need to use the contract ID for DPNS
            Value::String("dpns".to_string()),   // DPNS contract ID
            Value::String("domain".to_string()), // Document type
            where_clause.unwrap_or(Value::Null),
            Value::Null, // orderBy
            limit
                .map(|l| Value::Number(l.into()))
                .unwrap_or(Value::Null),
        ];

        self.request("get_documents".to_string(), params, network)
            .await
    }

    /// Check if a DPNS name is available
    pub async fn check_dpns_availability(
        &self,
        username: String,
        network: Network,
    ) -> Result<bool, DAPIError> {
        let result = self.resolve_dpns_name(username, network, false).await;

        match result {
            Ok(records) => Ok(records.is_empty()), // Available if no records found
            Err(DAPIError::APIFailed(_)) => {
                // If the API returns a specific error for "not found", it might be available
                // For now, we'll assume available on any API failure
                Ok(true)
            }
            Err(e) => Err(e),
        }
    }

    /// Get DPNS domain information including records
    pub async fn get_dpns_domain_info(
        &self,
        username: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Option<Value>, DAPIError> {
        let records = self
            .resolve_dpns_name(username, network, with_proof)
            .await?;

        if records.is_empty() {
            return Ok(None);
        }

        // Return the first record (should be the most recent/active)
        Ok(records.into_iter().next())
    }

    /// Get DPNS domains for multiple identities
    pub async fn batch_get_dpns_domains(
        &self,
        identity_ids: Vec<String>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let mut results = Vec::new();

        for identity_id in identity_ids {
            match self
                .get_dpns_username(identity_id.clone(), network, with_proof)
                .await
            {
                Ok(domains) => {
                    for domain in domains {
                        let mut record = serde_json::Map::new();
                        record.insert("identityId".to_string(), Value::String(identity_id.clone()));
                        record.insert("domain".to_string(), domain);
                        results.push(Value::Object(record));
                    }
                }
                Err(e) => {
                    // Log error but continue with other IDs
                    tracing::warn!("Failed to get DPNS for identity {}: {}", identity_id, e);
                }
            }
        }

        Ok(results)
    }

    /// Validate DPNS username format
    pub fn validate_dpns_username(username: &str) -> bool {
        // Basic validation without regex:
        // 1. Length between 3 and 63 characters
        if username.len() < 3 || username.len() > 63 {
            return false;
        }

        // 2. Must contain only alphanumeric characters and hyphens
        if !username.chars().all(|c| c.is_alphanumeric() || c == '-') {
            return false;
        }

        // 3. Cannot start or end with hyphen
        if username.starts_with('-') || username.ends_with('-') {
            return false;
        }

        // 4. Cannot contain consecutive hyphens (optional, but good practice)
        if username.contains("--") {
            return false;
        }

        true
    }

    /// Normalize DPNS username (lowercase, etc.)
    pub fn normalize_dpns_username(username: &str) -> String {
        username.to_lowercase()
    }
}
