// src-tauri/src/dapi/client.rs

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use lru_time_cache::LruCache;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use lazy_static::lazy_static;
use tracing::{info, warn, error};

use crate::constants::DAPI_WEB_API_ENDPOINT;
use super::types::{DAPIError, DAPIRequest, DAPIResponse, Network};

#[derive(Debug, Clone)]
struct MethodParamInfo {
    required_params: Vec<&'static str>,
    param_types: HashMap<&'static str, &'static str>,
}

pub struct DAPIClient {
    client: reqwest::Client,
    endpoint: String,
    cache: Arc<Mutex<LruCache<String, Value>>>,
}

impl DAPIClient {
    pub fn new(endpoint: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            endpoint,
            cache: Arc::new(Mutex::new(LruCache::with_capacity(100))),
        }
    }

    fn get_method_info(method: &str) -> Result<MethodParamInfo, DAPIError> {
        let info = match method {
            // Documents
            "get_documents" | "get_documents_with_proof_info" => MethodParamInfo {
                required_params: vec!["dataContractId", "documentType"],
                param_types: HashMap::from([
                    ("dataContractId", "string"),
                    ("documentType", "string"),
                    ("whereClause", "object"),
                    ("orderBy", "object"),
                    ("limit", "number"),
                    ("startAfter", "string"),
                    ("startAt", "string"),
                ]),
            },

            "get_document" | "get_document_with_proof_info" => MethodParamInfo {
                required_params: vec!["dataContractId", "documentType", "documentId"],
                param_types: HashMap::from([
                    ("dataContractId", "string"),
                    ("documentType", "string"),
                    ("documentId", "string"),
                ]),
            },

            // Identity
            "identity_fetch" | "identity_fetch_with_proof_info" => MethodParamInfo {
                required_params: vec!["identityId"],
                param_types: HashMap::from([
                    ("identityId", "string"),
                ]),
            },

            "get_identity_balance" | "get_identity_balance_with_proof_info" => MethodParamInfo {
                required_params: vec!["identityId"],
                param_types: HashMap::from([
                    ("identityId", "string"),
                ]),
            },

            "get_identity_by_public_key_hash" | "get_identity_by_public_key_hash_with_proof_info" => MethodParamInfo {
                required_params: vec!["publicKeyHash"],
                param_types: HashMap::from([
                    ("publicKeyHash", "string"),
                ]),
            },

            "get_identity_token_balances" | "get_identity_token_balances_with_proof_info" => MethodParamInfo {
                required_params: vec!["identityId", "tokenIds"],
                param_types: HashMap::from([
                    ("identityId", "string"),
                    ("tokenIds", "array"),
                ]),
            },

            // Contracts
            "data_contract_fetch" | "data_contract_fetch_with_proof_info" => MethodParamInfo {
                required_params: vec!["contractId"],
                param_types: HashMap::from([
                    ("contractId", "string"),
                ]),
            },

            "get_data_contract_history" | "get_data_contract_history_with_proof_info" => MethodParamInfo {
                required_params: vec!["contractId"],
                param_types: HashMap::from([
                    ("contractId", "string"),
                    ("limit", "number"),
                    ("offset", "number"),
                    ("startAtMs", "number"),
                ]),
            },

            // DPNS
            "dpns_resolve_name" | "get_dpns_username_by_name" | "get_dpns_username_by_name_with_proof_info" => MethodParamInfo {
                required_params: vec!["username"],
                param_types: HashMap::from([
                    ("username", "string"),
                ]),
            },

            "get_dpns_username" | "get_dpns_usernames" | "get_dpns_usernames_with_proof_info" => MethodParamInfo {
                required_params: vec!["identityId"],
                param_types: HashMap::from([
                    ("identityId", "string"),
                ]),
            },

            // Tokens
            "get_token_contract_info" | "get_token_contract_info_with_proof_info" => MethodParamInfo {
                required_params: vec!["dataContractId"],
                param_types: HashMap::from([
                    ("dataContractId", "string"),
                ]),
            },

            "get_token_statuses" | "get_token_statuses_with_proof_info" => MethodParamInfo {
                required_params: vec!["tokenIds"],
                param_types: HashMap::from([
                    ("tokenIds", "array"),
                ]),
            },

            "get_token_total_supply" | "get_token_total_supply_with_proof_info" => MethodParamInfo {
                required_params: vec!["tokenId"],
                param_types: HashMap::from([
                    ("tokenId", "string"),
                ]),
            },

            // System
            "get_status" => MethodParamInfo {
                required_params: vec![],
                param_types: HashMap::new(),
            },

            "get_current_epoch" | "get_current_epoch_with_proof_info" => MethodParamInfo {
                required_params: vec![],
                param_types: HashMap::new(),
            },

            "get_total_credits_in_platform" | "get_total_credits_in_platform_with_proof_info" => MethodParamInfo {
                required_params: vec![],
                param_types: HashMap::new(),
            },

            _ => {
                // For unknown methods, allow any params but log warning
                warn!("Unknown DAPI method: {}, skipping validation", method);
                return Ok(MethodParamInfo {
                    required_params: vec![],
                    param_types: HashMap::new(),
                });
            }
        };

        Ok(info)
    }

    fn validate_params(method: &str, params: &HashMap<String, Value>) -> Result<(), DAPIError> {
        let method_info = Self::get_method_info(method)?;

        // Check required params
        for required_param in &method_info.required_params {
            if !params.contains_key(*required_param) {
                return Err(DAPIError::MissingParameter(required_param.to_string()));
            }
        }

        // Validate param types
        for (param_name, param_value) in params {
            if let Some(expected_type) = method_info.param_types.get(param_name.as_str()) {
                match *expected_type {
                    "string" => {
                        if !param_value.is_string() {
                            return Err(DAPIError::InvalidParameterType(
                                param_name.clone(),
                                "string".to_string(),
                                param_value.to_string(),
                            ));
                        }
                    }
                    "number" => {
                        if !param_value.is_number() {
                            return Err(DAPIError::InvalidParameterType(
                                param_name.clone(),
                                "number".to_string(),
                                param_value.to_string(),
                            ));
                        }
                    }
                    "array" => {
                        if !param_value.is_array() {
                            return Err(DAPIError::InvalidParameterType(
                                param_name.clone(),
                                "array".to_string(),
                                param_value.to_string(),
                            ));
                        }
                    }
                    "object" => {
                        if !param_value.is_object() && !param_value.is_null() {
                            return Err(DAPIError::InvalidParameterType(
                                param_name.clone(),
                                "object".to_string(),
                                param_value.to_string(),
                            ));
                        }
                    }
                    "boolean" => {
                        if !param_value.is_boolean() {
                            return Err(DAPIError::InvalidParameterType(
                                param_name.clone(),
                                "boolean".to_string(),
                                param_value.to_string(),
                            ));
                        }
                    }
                    _ => {
                        // Skip validation for unknown types
                        warn!("Unknown param type for {}: {}", param_name, expected_type);
                    }
                }
            }
        }

        Ok(())
    }

    pub async fn request<T>(&self, method: String, params: HashMap<String, Value>, network: Network) -> Result<Vec<T>, DAPIError>
    where
        T: for<'de> Deserialize<'de> + Clone + Send + Sync,
    {
        // Validate parameters based on method
        Self::validate_params(&method, &params)?;

        // Create request
        let request = DAPIRequest {
            method: method.clone(),
            params,
            network: Some(network.as_str().to_string()),
        };

        // Generate cache key (simple hash of method + params)
        let cache_key = format!("{}-{:?}", method, serde_json::to_string(&request.params).unwrap_or_default());

        // Check cache first (5 minute TTL is default in LruCache)
        if let Some(cached) = self.cache.lock().await.get(&cache_key) {
            if let Ok(result) = serde_json::from_value::<Vec<T>>(cached.clone()) {
                info!("Cache hit for method: {}", method);
                return Ok(result);
            }
        }

        // Make API request
        info!("Making DAPI request: {} to {}", method, self.endpoint);
        let response = self.client
            .post(&self.endpoint)
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                error!("DAPI request failed: {}", e);
                DAPIError::RequestFailed(e.to_string())
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
            error!("DAPI HTTP error {}: {}", status, error_text);
            return Err(DAPIError::RequestFailed(format!("HTTP {}: {}", status, error_text)));
        }

        let api_response: DAPIResponse<T> = response
            .json()
            .await
            .map_err(|e| {
                error!("Failed to parse DAPI response: {}", e);
                DAPIError::SerializationError(e.to_string())
            })?;

        if !api_response.success {
            error!("DAPI method {} failed: {:?}", method, api_response);
            return Err(DAPIError::APIFailed(format!("DAPI method {} failed", method)));
        }

        // Cache the result
        let result = api_response.result.clone();
        let cache_value = serde_json::to_value(&result)
            .map_err(|e| DAPIError::SerializationError(e.to_string()))?;

        self.cache.lock().await.insert(cache_key, cache_value);

        info!("DAPI request successful: {} returned {} items", method, result.len());
        Ok(result)
    }

    // Convenience methods for common operations
    pub async fn get_documents(
        &self,
        data_contract_id: String,
        document_type: String,
        network: Network,
        where_clause: Option<Value>,
        order_by: Option<Value>,
        limit: Option<u32>,
        start_after: Option<String>,
        start_at: Option<String>,
    ) -> Result<Vec<Value>, DAPIError> {
        let mut params = HashMap::new();
        params.insert("dataContractId".to_string(), Value::String(data_contract_id));
        params.insert("documentType".to_string(), Value::String(document_type));

        if let Some(where_clause) = where_clause {
            params.insert("whereClause".to_string(), where_clause);
        }
        if let Some(order_by) = order_by {
            params.insert("orderBy".to_string(), order_by);
        }
        if let Some(limit) = limit {
            params.insert("limit".to_string(), Value::Number(serde_json::Number::from(limit)));
        }
        if let Some(start_after) = start_after {
            params.insert("startAfter".to_string(), Value::String(start_after));
        }
        if let Some(start_at) = start_at {
            params.insert("startAt".to_string(), Value::String(start_at));
        }

        self.request("get_documents".to_string(), params, network).await
    }

    pub async fn get_identity(
        &self,
        identity_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<super::types::Identity>, DAPIError> {
        let method = if with_proof {
            "identity_fetch_with_proof_info".to_string()
        } else {
            "identity_fetch".to_string()
        };

        let mut params = HashMap::new();
        params.insert("identityId".to_string(), Value::String(identity_id));

        self.request(method, params, network).await
    }

    pub async fn get_identity_balance(
        &self,
        identity_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identity_balance_with_proof_info".to_string()
        } else {
            "get_identity_balance".to_string()
        };

        let mut params = HashMap::new();
        params.insert("identityId".to_string(), Value::String(identity_id));

        self.request(method, params, network).await
    }

    pub async fn get_identity_token_balances(
        &self,
        identity_id: String,
        token_ids: Vec<String>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<super::types::TokenBalance>, DAPIError> {
        let method = if with_proof {
            "get_identity_token_balances_with_proof_info".to_string()
        } else {
            "get_identity_token_balances".to_string()
        };

        let mut params = HashMap::new();
        params.insert("identityId".to_string(), Value::String(identity_id));
        params.insert("tokenIds".to_string(), Value::Array(
            token_ids.into_iter().map(Value::String).collect()
        ));

        self.request(method, params, network).await
    }

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

        let mut params = HashMap::new();
        params.insert("identityId".to_string(), Value::String(identity_id));

        self.request(method, params, network).await
    }

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

        let mut params = HashMap::new();
        params.insert("username".to_string(), Value::String(username));

        self.request(method, params, network).await
    }

    pub async fn get_status(&self, network: Network) -> Result<Vec<Value>, DAPIError> {
        let mut params = HashMap::new();
        self.request("get_status".to_string(), params, network).await
    }
}

// Global client instance
lazy_static! {
    static ref DAPI_CLIENT: DAPIClient = DAPIClient::new(DAPI_WEB_API_ENDPOINT.to_string());
}

pub fn get_dapi_client() -> &'static DAPIClient {
    &DAPI_CLIENT
}
