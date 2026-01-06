// src-tauri/src/dapi/client/base.rs

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::{info, error};

use crate::constants::DAPI_WEB_API_ENDPOINT;
use super::validation::{validate_dapi_params, MethodParamInfo};
use super::cache::Cache;
use crate::dapi::types::{DAPIError, DAPIRequest, DAPIResponse, Network};

pub struct DAPIClient {
    client: reqwest::Client,
    endpoint: String,
    cache: Arc<Mutex<Cache>>,
}

impl DAPIClient {
    pub fn new(endpoint: String) -> Self {
        Self {
            client: reqwest::Client::new(),
            endpoint,
            cache: Arc::new(Mutex::new(Cache::new(100))),
        }
    }

    pub async fn request<T>(&self, method: String, params: Vec<Value>, network: Network) -> Result<Vec<T>, DAPIError>
    where
        T: for<'de> Deserialize<'de> + Serialize + Clone + Send + Sync + std::fmt::Debug,
    {
        // Validate using param names
        let method_info = MethodParamInfo::for_method(&method)?;
        let mut params_map = HashMap::new();
        let params_clone = params.clone();
        for (i, value) in params_clone.into_iter().enumerate() {
            if i < method_info.required_params.len() {
                params_map.insert(method_info.required_params[i].to_string(), value);
            }
        }
        validate_dapi_params(&method, &params_map)?;

        // Prepare request body
        let request = DAPIRequest {
            method: method.clone(),
            params: Value::Array(params),
            network: Some(network.as_str().to_string()),
        };

        // CRITICAL: include network in cache key so mainnet/testnet never collide
        let cache_key = format!("{}-{}-{}", method, request.params.to_string(), network.as_str());

        // Cache lookup
        if let Some(cached) = self.cache.lock().await.get(&cache_key) {
            if let Ok(result) = serde_json::from_value::<Vec<T>>(cached.clone()) {
                info!("Cache hit for method: {} (network={})", method, network.as_str());
                return Ok(result);
            }
        }

        info!("Making DAPI request: {} to {} (network={})", method, self.endpoint, network.as_str());
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

        let api_response: DAPIResponse = response
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

        let result = api_response.into_result::<T>()?;

        // Cache store
        let cache_value = serde_json::to_value(&result)
            .map_err(|e| DAPIError::SerializationError(e.to_string()))?;
        self.cache.lock().await.set(cache_key, cache_value);

        info!("DAPI request successful: {} returned {} items (network={})", method, result.len(), network.as_str());
        Ok(result)
    }

    pub fn get_endpoint(&self) -> &str {
        &self.endpoint
    }
}

lazy_static::lazy_static! {
    static ref DAPI_CLIENT: DAPIClient = DAPIClient::new(DAPI_WEB_API_ENDPOINT.to_string());
}

pub fn get_dapi_client() -> &'static DAPIClient {
    &DAPI_CLIENT
}
