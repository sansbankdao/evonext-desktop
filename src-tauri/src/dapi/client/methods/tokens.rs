// src-tauri/src/dapi/client/methods/tokens.rs

use crate::dapi::types::{DAPIError, Network, TokenContractInfo};
use crate::dapi::DAPIClient;
use serde_json::Value;

#[cfg(test)]
mod tests;

impl DAPIClient {
    pub async fn get_token_contract_info(
        &self,
        contract_id: String,
        network: Network,
    ) -> Result<Vec<TokenContractInfo>, DAPIError> {
        let method = "get_token_contract_info".to_string();
        let params = vec![Value::String(contract_id)];
        self.request(method, params, network).await
    }

    pub fn format_token_balance(balance: u64, decimals: u32) -> String {
        let divisor = 10u64.pow(decimals);
        let whole = balance / divisor;
        let fraction = balance % divisor;
        if fraction == 0 {
            format!("{}", whole)
        } else {
            let fraction_str = format!("{:0>width$}", fraction, width = decimals as usize);
            let trimmed = fraction_str.trim_end_matches('0');
            if trimmed.is_empty() {
                format!("{}", whole)
            } else {
                format!("{}.{}", whole, trimmed)
            }
        }
    }

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

                // If the user provided more decimals than the contract supports, we fail or truncate.
                // Here we truncate to 'decimals' length to match padding.
                let len = fraction_str.len();
                let (proc_fraction, multiplier) = if len > decimals as usize {
                    (fraction_str[..decimals as usize].to_string(), 1u64)
                } else {
                    // Pad with trailing zeros: "5" with 8 decimals becomes "50000000"
                    let padding = (decimals as usize) - len;
                    let mut padded = fraction_str.to_string();
                    for _ in 0..padding {
                        padded.push('0');
                    }
                    (padded, 1u64)
                };

                let fraction = proc_fraction.parse::<u64>().ok()?;
                Some((whole * 10u64.pow(decimals)) + (fraction * multiplier))
            }
            _ => None,
        }
    }
}
