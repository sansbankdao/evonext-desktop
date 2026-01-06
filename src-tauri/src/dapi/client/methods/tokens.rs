// src-tauri/src/dapi/client/methods/tokens.rs

use serde_json::Value;
use crate::dapi::types::{DAPIError, Network, TokenContractInfo};
use super::super::DAPIClient;

impl DAPIClient {
    /// Get token contract information (typed)
    pub async fn get_token_contract_info(
        &self,
        contract_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<TokenContractInfo>, DAPIError> {
        let method = if with_proof {
            "get_token_contract_info_with_proof_info".to_string()
        } else {
            "get_token_contract_info".to_string()
        };

        let params = vec![Value::String(contract_id)];
        self.request(method, params, network).await
    }

    /// Get token statuses for multiple tokens (untyped for safety)
    pub async fn get_token_statuses(
        &self,
        token_ids: Vec<String>,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_token_statuses_with_proof_info".to_string()
        } else {
            "get_token_statuses".to_string()
        };

        let token_ids_array: Vec<Value> = token_ids.into_iter().map(Value::String).collect();
        let params = vec![Value::Array(token_ids_array)];

        self.request(method, params, network).await
    }

    /// Get total token supply (untyped for safety)
    pub async fn get_token_total_supply(
        &self,
        token_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_token_total_supply_with_proof_info".to_string()
        } else {
            "get_token_total_supply".to_string()
        };

        let params = vec![Value::String(token_id)];
        self.request(method, params, network).await
    }

    /// Get token balances for multiple identities (untyped for safety)
    pub async fn get_identities_token_balances(
        &self,
        identity_ids: Vec<String>,
        token_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_identities_token_balances_with_proof_info".to_string()
        } else {
            "get_identities_token_balances".to_string()
        };

        let identities_array: Vec<Value> = identity_ids.into_iter().map(Value::String).collect();
        let params = vec![Value::Array(identities_array), Value::String(token_id)];

        self.request(method, params, network).await
    }

    /// Get DUSD token contract info (typed)
    pub async fn get_dusd_token_info(
        &self,
        network: Network,
        with_proof: bool,
    ) -> Result<Option<TokenContractInfo>, DAPIError> {
        use crate::constants::{DUSD_CONTRACT_ID_MAINNET, DUSD_CONTRACT_ID_TESTNET};

        let contract_id = match network {
            Network::Mainnet => DUSD_CONTRACT_ID_MAINNET,
            Network::Testnet => DUSD_CONTRACT_ID_TESTNET,
        };

        let result = self
            .get_token_contract_info(contract_id.to_string(), network, with_proof)
            .await?;
        Ok(result.into_iter().next())
    }

    /// Get SANS token contract info (typed)
    pub async fn get_sans_token_info(
        &self,
        network: Network,
        with_proof: bool,
    ) -> Result<Option<TokenContractInfo>, DAPIError> {
        use crate::constants::{SANS_CONTRACT_ID_MAINNET, SANS_CONTRACT_ID_TESTNET};

        let contract_id = match network {
            Network::Mainnet => SANS_CONTRACT_ID_MAINNET,
            Network::Testnet => SANS_CONTRACT_ID_TESTNET,
        };

        let result = self
            .get_token_contract_info(contract_id.to_string(), network, with_proof)
            .await?;
        Ok(result.into_iter().next())
    }

    /// Get EvoNext token contract info (typed)
    pub async fn get_evonext_token_info(
        &self,
        network: Network,
        with_proof: bool,
    ) -> Result<Option<TokenContractInfo>, DAPIError> {
        use crate::constants::{EVONEXT_CONTRACT_ID_MAINNET, EVONEXT_CONTRACT_ID_TESTNET};

        let contract_id = match network {
            Network::Mainnet => EVONEXT_CONTRACT_ID_MAINNET,
            Network::Testnet => EVONEXT_CONTRACT_ID_TESTNET,
        };

        let result = self
            .get_token_contract_info(contract_id.to_string(), network, with_proof)
            .await?;
        Ok(result.into_iter().next())
    }

    /// Get token balances for common tokens (DUSD, SANS) - untyped for safety
    pub async fn get_common_token_balances(
        &self,
        identity_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        use crate::constants::{
            DUSD_CONTRACT_ID_MAINNET, DUSD_CONTRACT_ID_TESTNET,
            SANS_CONTRACT_ID_MAINNET, SANS_CONTRACT_ID_TESTNET
        };

        let (dusd_id, sans_id) = match network {
            Network::Mainnet => (DUSD_CONTRACT_ID_MAINNET, SANS_CONTRACT_ID_MAINNET),
            Network::Testnet => (DUSD_CONTRACT_ID_TESTNET, SANS_CONTRACT_ID_TESTNET),
        };

        let token_ids = vec![dusd_id.to_string(), sans_id.to_string()];

        // IMPORTANT:
        // Use UFCS and explicitly call the identity module method to avoid
        // ambiguity if another method of the same name exists anywhere else.
        crate::dapi::client::methods::identity::DAPIClient::get_identity_token_balances(
            self,
            identity_id,
            token_ids,
            network,
            with_proof,
        )
        .await
    }

    /// Get all token balances for an identity (currently common tokens) - untyped
    pub async fn get_all_token_balances(
        &self,
        identity_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        self.get_common_token_balances(identity_id, network, with_proof).await
    }

    /// Format token balance with decimals (utility)
    pub fn format_token_balance(balance: u64, decimals: u32) -> String {
        let divisor = 10u64.pow(decimals);
        let whole = balance / divisor;
        let fraction = balance % divisor;

        if fraction == 0 {
            format!("{}", whole)
        } else {
            // Remove trailing zeros
            let fraction_str = format!("{:0>width$}", fraction, width = decimals as usize);
            let trimmed = fraction_str.trim_end_matches('0');

            if trimmed.is_empty() {
                format!("{}", whole)
            } else {
                format!("{}.{}", whole, trimmed)
            }
        }
    }

    /// Convert formatted balance back to atomic units (utility)
    pub fn parse_token_amount(amount: &str, decimals: u32) -> Option<u64> {
        let parts: Vec<&str> = amount.split('.').collect();

        match parts.len() {
            1 => {
                let whole = parts[0].parse::<u64>().ok()?;
                Some(whole * 10u64.pow(decimals))
            }
            2 => {
                let whole = parts[0].parse::<u64>().ok()?;
                let fraction_str = parts[1];

                let fraction = if fraction_str.len() > decimals as usize {
                    fraction_str[..decimals as usize].parse::<u64>().ok()?
                } else {
                    let padded = format!("{:<0width$}", fraction_str, width = decimals as usize);
                    padded.parse::<u64>().ok()?
                };

                Some(whole * 10u64.pow(decimals) + fraction)
            }
            _ => None,
        }
    }
}
