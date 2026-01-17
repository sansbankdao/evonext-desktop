// src-tauri/src/dapi/client/methods/contracts.rs

use super::super::DAPIClient;
use crate::dapi::types::{DAPIError, Network};
use serde_json::Value;

impl DAPIClient {
    /// Fetch data contract
    pub async fn get_data_contract(
        &self,
        contract_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "data_contract_fetch_with_proof_info".to_string()
        } else {
            "data_contract_fetch".to_string()
        };

        let params = vec![Value::String(contract_id)];

        self.request(method, params, network).await
    }

    /// Get data contract history
    pub async fn get_data_contract_history(
        &self,
        contract_id: String,
        network: Network,
        limit: Option<u32>,
        offset: Option<u32>,
        start_at_ms: Option<u64>,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_data_contract_history_with_proof_info".to_string()
        } else {
            "get_data_contract_history".to_string()
        };

        let mut params = vec![Value::String(contract_id)];

        // Add optional parameters
        params.push(
            limit
                .map(|l| Value::Number(l.into()))
                .unwrap_or(Value::Null),
        );
        params.push(
            offset
                .map(|o| Value::Number(o.into()))
                .unwrap_or(Value::Null),
        );
        params.push(
            start_at_ms
                .map(|s| Value::Number(s.into()))
                .unwrap_or(Value::Null),
        );

        self.request(method, params, network).await
    }

    /// Get multiple data contracts
    pub async fn get_data_contracts(
        &self,
        contract_ids: Vec<String>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_data_contracts_with_proof_info".to_string()
        } else {
            "get_data_contracts".to_string()
        };

        let ids_array: Vec<Value> = contract_ids.into_iter().map(Value::String).collect();
        let params = vec![Value::Array(ids_array)];

        self.request(method, params, network).await
    }

    /// Get group info
    pub async fn get_group_info(
        &self,
        contract_id: String,
        group_position: u32,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_group_info_with_proof_info".to_string()
        } else {
            "get_group_info".to_string()
        };

        let params = vec![
            Value::String(contract_id),
            Value::Number(serde_json::Number::from(group_position)),
        ];

        self.request(method, params, network).await
    }

    /// Get all group infos for a contract
    pub async fn get_group_infos(
        &self,
        contract_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_group_infos_with_proof_info".to_string()
        } else {
            "get_group_infos".to_string()
        };

        let params = vec![Value::String(contract_id)];

        self.request(method, params, network).await
    }

    /// Get group members
    pub async fn get_group_members(
        &self,
        contract_id: String,
        group_position: u32,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let params = vec![
            Value::String(contract_id),
            Value::Number(serde_json::Number::from(group_position)),
        ];

        self.request("get_group_members".to_string(), params, network)
            .await
    }

    /// Get contested resources
    pub async fn get_contested_resources(
        &self,
        document_type_name: Option<String>,
        data_contract_id: Option<String>,
        index_name: Option<String>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_contested_resources_with_proof_info".to_string()
        } else {
            "get_contested_resources".to_string()
        };

        let mut params = vec![];

        // Add optional parameters
        params.push(document_type_name.map(Value::String).unwrap_or(Value::Null));
        params.push(data_contract_id.map(Value::String).unwrap_or(Value::Null));
        params.push(index_name.map(Value::String).unwrap_or(Value::Null));

        self.request(method, params, network).await
    }
}
