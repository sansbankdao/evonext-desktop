// src-tauri/src/dapi/client/base.rs

use super::cache::Cache;
use super::validation::{validate_dapi_params, MethodParamInfo};
use crate::constants::DAPI_WEB_API_ENDPOINT;
use crate::dapi::types::{DAPIError, DAPIRequest, DAPIResponse, Network};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fmt::Debug;
use std::sync::Arc;
use tokio::sync::Mutex;

#[cfg(test)]
mod tests;

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

    pub async fn request<T>(
        &self,
        method: String,
        params: Vec<Value>,
        network: Network,
    ) -> Result<Vec<T>, DAPIError>
    where
        T: for<'de> Deserialize<'de> + Serialize + Clone + Send + Sync + Debug,
    {
        let method_info = MethodParamInfo::for_method(&method)?;
        let mut params_map = HashMap::new();
        for (i, value) in params.iter().enumerate() {
            if i < method_info.required_params.len() {
                params_map.insert(method_info.required_params[i].to_string(), value.clone());
            }
        }
        validate_dapi_params(&method, &params_map)?;

        let request = DAPIRequest {
            method: method.clone(),
            params: Value::Array(params),
            network: Some(network.as_str().to_string()),
        };

        let cache_key = format!("{}-{}-{}", method, request.params, network.as_str());
        if let Some(cached) = self.cache.lock().await.get(&cache_key) {
            if let Ok(result) = serde_json::from_value::<Vec<T>>(cached) {
                return Ok(result);
            }
        }

        let response = self
            .client
            .post(&self.endpoint)
            .json(&request)
            .send()
            .await
            .map_err(|e| DAPIError::RequestFailed(e.to_string()))?;

        let response_text = response.text().await.map_err(|e| {
            DAPIError::SerializationError(format!("Failed to read response body: {}", e))
        })?;

        let result = self.parse_response_text::<T>(&method, &response_text)?;

        if let Ok(cache_value) = serde_json::to_value(&result) {
            self.cache.lock().await.set(cache_key, cache_value);
        }

        Ok(result)
    }

    pub(crate) fn parse_response_text<T>(
        &self,
        method: &str,
        text: &str,
    ) -> Result<Vec<T>, DAPIError>
    where
        T: for<'de> Deserialize<'de> + Debug,
    {
        if let Ok(api_response) = serde_json::from_str::<DAPIResponse>(text) {
            if !api_response.success {
                return Err(DAPIError::APIFailed(method.into()));
            }
            api_response.into_result::<T>()
        } else if let Ok(raw_array) = serde_json::from_str::<Vec<T>>(text) {
            Ok(raw_array)
        } else if let Ok(single_item) = serde_json::from_str::<T>(text) {
            Ok(vec![single_item])
        } else {
            Err(DAPIError::SerializationError(
                "Unsupported response format".into(),
            ))
        }
    }
}

lazy_static::lazy_static! {
    static ref DAPI_CLIENT: DAPIClient = DAPIClient::new(DAPI_WEB_API_ENDPOINT.to_string());
}

pub fn get_dapi_client() -> &'static DAPIClient {
    &DAPI_CLIENT
}
