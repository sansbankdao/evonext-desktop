// src-tauri/src/dapi/client/base.rs

use super::cache::Cache;
use super::validation::{validate_dapi_params, MethodParamInfo};
use crate::constants::DAPI_WEB_API_ENDPOINT;
use crate::dapi::types::{DAPIError, DAPIRequest, DAPIResponse, Network};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::{error, info};

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
            cache: Arc::new(Mutex::new(Cache::new(200))),
        }
    }

    /// Generic request method for DAPI calls
    pub async fn request<T>(
        &self,
        method: String,
        params: Vec<Value>,
        network: Network,
    ) -> Result<Vec<T>, DAPIError>
    where
        T: for<'de> Deserialize<'de> + Serialize + Clone + Send + Sync + std::fmt::Debug,
    {
        // 1. Validate parameters against internal method schema
        let method_info = MethodParamInfo::for_method(&method)?;
        let mut params_map = HashMap::new();
        let params_clone = params.clone();
        for (i, value) in params_clone.into_iter().enumerate() {
            if i < method_info.required_params.len() {
                params_map.insert(method_info.required_params[i].to_string(), value);
            }
        }
        validate_dapi_params(&method, &params_map)?;

        // 2. Construct the request payload
        let request = DAPIRequest {
            method: method.clone(),
            params: Value::Array(params),
            network: Some(network.as_str().to_string()),
        };

        // 3. Cache lookup
        let cache_key = format!(
            "{}-{}-{}",
            method,
            request.params.to_string(),
            network.as_str()
        );
        if let Some(cached) = self.cache.lock().await.get(&cache_key) {
            if let Ok(result) = serde_json::from_value::<Vec<T>>(cached.clone()) {
                info!("Cache hit for {}: {}", method, network.as_str());
                return Ok(result);
            }
        }

        // 4. Log Outbound Request
        let payload_str = serde_json::to_string(&request).unwrap_or_default();
        println!(
            "[NETWORK_TRACE] Method: {} | Outbound JSON Payload: {}",
            method, payload_str
        );

        // 5. Send HTTP Request
        let response = self
            .client
            .post(&self.endpoint)
            .json(&request)
            .send()
            .await
            .map_err(|e| {
                error!("DAPI request failed: {}", e);
                DAPIError::RequestFailed(e.to_string())
            })?;

        // 6. Monitor HTTP Status
        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            eprintln!(
                "[NETWORK_ERROR] Method: {} | HTTP {}: {}",
                method, status, error_text
            );
            return Err(DAPIError::RequestFailed(format!(
                "HTTP {}: {}",
                status, error_text
            )));
        }

        // 7. Get Response Body as Text
        let response_text = response.text().await.map_err(|e| {
            eprintln!("[NETWORK_ERROR] Method: {} | Failed to read response body: {}", method, e);
            DAPIError::SerializationError(format!("Failed to read response body: {}", e))
        })?;

        // =========================================================================
        // CRITICAL DEBUG: Force Inbound Trace to stderr
        // =========================================================================
        eprintln!(
            "[NETWORK_TRACE] Method: {} | Inbound Raw Response: {}",
            method, response_text
        );

        // 8. Attempt Dual-Parsing (Wrapped vs Raw)
        let result: Vec<T> =
            if let Ok(api_response) = serde_json::from_str::<DAPIResponse>(&response_text) {
                // Case A: Response has a success/result wrapper
                if !api_response.success {
                    eprintln!("[API_ERROR] Method: {} | Body: {}", method, response_text);
                    return Err(DAPIError::APIFailed(format!(
                        "DAPI method {} failure",
                        method
                    )));
                }
                api_response.into_result::<T>()?
            } else if let Ok(raw_array) = serde_json::from_str::<Vec<T>>(&response_text) {
                // Case B: Response is a direct JSON array (Matches your current logs)
                raw_array
            } else {
                // Case C: Deserialization failed for both patterns
                error!("Failed to parse DAPI response for {}", method);
                eprintln!("[SERIALIZATION_FAILURE] Method: {} | Raw Body: {}", method, response_text);
                return Err(DAPIError::SerializationError(
                    "Unsupported response format".into(),
                ));
            };

        // 9. Cache successful result
        if let Ok(cache_value) = serde_json::to_value(&result) {
            self.cache.lock().await.set(cache_key, cache_value);
        }

        // 10. Success Trace
        eprintln!(
            "[NETWORK_SUCCESS] Method: {} | Returned {} items",
            method,
            result.len()
        );

        info!(
            "DAPI request successful: {} returned {} items",
            method,
            result.len()
        );
        Ok(result)
    }
}

lazy_static::lazy_static! {
    static ref DAPI_CLIENT: DAPIClient = DAPIClient::new(DAPI_WEB_API_ENDPOINT.to_string());
}

pub fn get_dapi_client() -> &'static DAPIClient {
    &DAPI_CLIENT
}
