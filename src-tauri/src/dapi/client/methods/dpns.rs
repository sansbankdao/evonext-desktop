// src-tauri/src/dapi/client/methods/dpns.rs

use super::super::DAPIClient;
use crate::dapi::types::{DAPIError, Network};
use serde_json::Value;

#[cfg(test)]
mod tests;

impl DAPIClient {
    pub async fn resolve_dpns_name(&self, username: String, network: Network) -> Result<Vec<Value>, DAPIError> {
        let method = "dpns_resolve_name".to_string();
        let params = vec![Value::String(username)];
        self.request(method, params, network).await
    }

    pub async fn get_dpns_username(&self, identity_id: String, network: Network) -> Result<Vec<Value>, DAPIError> {
        let method = "get_dpns_username".to_string();
        let params = vec![Value::String(identity_id)];
        self.request(method, params, network).await
    }

    pub async fn get_dpns_usernames(&self, identity_id: String, network: Network) -> Result<Vec<Value>, DAPIError> {
        let method = "get_dpns_usernames".to_string();
        let params = vec![Value::String(identity_id)];
        self.request(method, params, network).await
    }

    pub async fn search_dpns_names(&self, prefix: String, network: Network, limit: Option<u32>) -> Result<Vec<Value>, DAPIError> {
        let where_clause = Some(serde_json::json!({
            "normalizedParentDomainName": "dash",
            "normalizedLabel": { "$startsWith": prefix.to_lowercase() }
        }));

        let params = vec![
            Value::String("dpns".to_string()),
            Value::String("domain".to_string()),
            where_clause.unwrap_or(Value::Null),
            Value::Null,
            limit.map(|l| Value::Number(l.into())).unwrap_or(Value::Null),
        ];
        self.request("get_documents".to_string(), params, network).await
    }

    pub async fn check_dpns_availability(&self, username: String, network: Network) -> Result<bool, DAPIError> {
        match self.resolve_dpns_name(username, network).await {
            Ok(records) => Ok(records.is_empty()),
            Err(DAPIError::APIFailed(_)) => Ok(true),
            Err(e) => Err(e),
        }
    }

    pub async fn get_dpns_domain_info(&self, username: String, network: Network) -> Result<Option<Value>, DAPIError> {
        let records = self.resolve_dpns_name(username, network).await?;
        Ok(records.into_iter().next())
    }

    pub async fn batch_get_dpns_domains(&self, identity_ids: Vec<String>, network: Network) -> Result<Vec<Value>, DAPIError> {
        let mut results = Vec::new();
        for identity_id in identity_ids {
            if let Ok(domains) = self.get_dpns_username(identity_id.clone(), network).await {
                for domain in domains {
                    let mut record = serde_json::Map::new();
                    record.insert("identityId".to_string(), Value::String(identity_id.clone()));
                    record.insert("domain".to_string(), domain);
                    results.push(Value::Object(record));
                }
            }
        }
        Ok(results)
    }

    pub fn validate_dpns_username(username: &str) -> bool {
        if username.len() < 3 || username.len() > 63 { return false; }
        if !username.chars().all(|c| c.is_alphanumeric() || c == '-') { return false; }
        if username.starts_with('-') || username.ends_with('-') { return false; }
        if username.contains("--") { return false; }
        true
    }

    pub fn normalize_dpns_username(username: &str) -> String {
        username.to_lowercase()
    }
}
