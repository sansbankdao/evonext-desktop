// src-tauri/src/dapi/client/methods/identity.rs

use serde_json::Value;
use crate::dapi::types::{DAPIError, Network};
use crate::dapi::DAPIClient;

impl DAPIClient {
    /// Fetch identity information (untyped)
    pub async fn get_identity(
        &self,
        identity_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "identity_fetch_with_proof_info".to_string()
        } else {
            "identity_fetch".to_string()
        };

        let params = vec![Value::String(identity_id)];
        self.request::<Value>(method, params, network).await
    }

    /// Get identity balance (untyped)
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

        let params = vec![Value::String(identity_id)];
        self.request::<Value>(method, params, network).await
    }

    /// Get identity by public key hash (untyped)
    pub async fn get_identity_by_public_key_hash(
        &self,
        public_key_hash: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identity_by_public_key_hash_with_proof_info".to_string()
        } else {
            "get_identity_by_public_key_hash".to_string()
        };

        let params = vec![Value::String(public_key_hash)];
        self.request::<Value>(method, params, network).await
    }

    /// Get identity nonce (untyped)
    pub async fn get_identity_nonce(
        &self,
        identity_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identity_nonce_with_proof_info".to_string()
        } else {
            "get_identity_nonce".to_string()
        };

        let params = vec![Value::String(identity_id)];
        self.request::<Value>(method, params, network).await
    }

    /// Get identity contract nonce (untyped)
    pub async fn get_identity_contract_nonce(
        &self,
        identity_id: String,
        contract_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identity_contract_nonce_with_proof_info".to_string()
        } else {
            "get_identity_contract_nonce".to_string()
        };

        let params = vec![Value::String(identity_id), Value::String(contract_id)];
        self.request::<Value>(method, params, network).await
    }

    /// Get identity keys (untyped)
    pub async fn get_identity_keys(
        &self,
        identity_id: String,
        key_request_type: Option<String>,
        key_ids: Option<Vec<u32>>,
        limit: Option<u32>,
        offset: Option<u32>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identity_keys_with_proof_info".to_string()
        } else {
            "get_identity_keys".to_string()
        };

        let mut params = vec![Value::String(identity_id)];
        params.push(key_request_type.map(Value::String).unwrap_or(Value::Null));

        if let Some(ids) = key_ids {
            let id_values: Vec<Value> = ids.into_iter().map(|id| Value::Number(id.into())).collect();
            params.push(Value::Array(id_values));
        } else {
            params.push(Value::Null);
        }

        params.push(limit.map(|l| Value::Number(l.into())).unwrap_or(Value::Null));
        params.push(offset.map(|o| Value::Number(o.into())).unwrap_or(Value::Null));

        self.request::<Value>(method, params, network).await
    }

    /// Get token balances for an identity across provided token IDs (untyped)
    pub async fn get_identity_token_balances(
        &self,
        identity_id: String,
        token_ids: Vec<String>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identity_token_balances_with_proof_info".to_string()
        } else {
            "get_identity_token_balances".to_string()
        };

        let token_ids_array: Vec<Value> = token_ids.into_iter().map(Value::String).collect();
        let params = vec![Value::String(identity_id), Value::Array(token_ids_array)];

        self.request::<Value>(method, params, network).await
    }

    /// Get identities balances in batch (untyped)
    pub async fn get_identities_balances(
        &self,
        identity_ids: Vec<String>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identities_balances_with_proof_info".to_string()
        } else {
            "get_identities_balances".to_string()
        };

        let ids_array: Vec<Value> = identity_ids.into_iter().map(Value::String).collect();
        let params = vec![Value::Array(ids_array)];

        self.request::<Value>(method, params, network).await
    }

    /// Get identity balance and revision (untyped)
    pub async fn get_identity_balance_and_revision(
        &self,
        identity_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identity_balance_and_revision_with_proof_info".to_string()
        } else {
            "get_identity_balance_and_revision".to_string()
        };

        let params = vec![Value::String(identity_id)];
        self.request::<Value>(method, params, network).await
    }

    /// Get identities contract keys (untyped)
    pub async fn get_identities_contract_keys(
        &self,
        identity_ids: Vec<String>,
        contract_id: String,
        purposes: Option<Vec<u32>>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identities_contract_keys_with_proof_info".to_string()
        } else {
            "get_identities_contract_keys".to_string()
        };

        let mut params = vec![];

        let ids_array: Vec<Value> = identity_ids.into_iter().map(Value::String).collect();
        params.push(Value::Array(ids_array));

        params.push(Value::String(contract_id));

        if let Some(purposes_vec) = purposes {
            let purposes_array: Vec<Value> = purposes_vec.into_iter()
                .map(|p| Value::Number(p.into()))
                .collect();
            params.push(Value::Array(purposes_array));
        } else {
            params.push(Value::Null);
        }

        self.request::<Value>(method, params, network).await
    }
}
