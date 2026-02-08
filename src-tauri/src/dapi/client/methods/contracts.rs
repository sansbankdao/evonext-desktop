// src-tauri/src/dapi/client/methods/contracts.rs

use super::super::DAPIClient;
use crate::dapi::types::{DAPIError, Network};
use serde_json::Value;

#[cfg(test)]
mod tests;

impl DAPIClient {
    pub async fn get_data_contract(
        &self,
        contract_id: String,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = "data_contract_fetch".to_string();
        let params = vec![Value::String(contract_id)];
        self.request(method, params, network).await
    }
    pub async fn get_data_contracts(
        &self,
        contract_ids: Vec<String>,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = "get_data_contracts".to_string();
        let ids_array: Vec<Value> = contract_ids.into_iter().map(Value::String).collect();
        let params = vec![Value::Array(ids_array)];
        self.request(method, params, network).await
    }
}
