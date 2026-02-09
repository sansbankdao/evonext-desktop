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

    /// Converts a raw balance string (e.g., "150000000") to a human-readable string (e.g., "1.5")
    pub fn format_token_balance(raw_balance: &str, decimals: u32) -> String {
        let balance = raw_balance.parse::<u128>().unwrap_or(0);
        let divisor = 10u128.pow(decimals);

        let whole = balance / divisor;
        let fraction = balance % divisor;

        if fraction == 0 {
            whole.to_string()
        } else {
            // Pad the fraction with leading zeros based on the decimals count
            let fraction_str = format!("{:0>width$}", fraction, width = decimals as usize);
            let trimmed = fraction_str.trim_end_matches('0');

            if trimmed.is_empty() {
                whole.to_string()
            } else {
                format!("{}.{}", whole, trimmed)
            }
        }
    }

    /// Converts a human-readable string (e.g., "1.5") to a raw balance string (e.g., "150000000")
    pub fn parse_token_amount(amount: &str, decimals: u32) -> Option<String> {
        let parts: Vec<&str> = amount.split('.').collect();
        let multiplier = 10u128.pow(decimals);

        match parts.len() {
            1 => {
                let whole = parts[0].parse::<u128>().ok()?;
                Some((whole * multiplier).to_string())
            }
            2 => {
                let whole = parts[0].parse::<u128>().ok()?;
                let fraction_str = parts[1];

                let len = fraction_str.len();
                if len > decimals as usize {
                    // Truncate if user provided more decimals than supported
                    let truncated_fraction = &fraction_str[..decimals as usize];
                    let fraction = truncated_fraction.parse::<u128>().ok()?;
                    Some(((whole * multiplier) + fraction).to_string())
                } else {
                    // Pad with trailing zeros: "5" with 8 decimals becomes "50000000"
                    let padding = (decimals as usize) - len;
                    let mut padded = fraction_str.to_string();
                    for _ in 0..padding {
                        padded.push('0');
                    }
                    let fraction = padded.parse::<u128>().ok()?;
                    Some(((whole * multiplier) + fraction).to_string())
                }
            }
            _ => None,
        }
    }
}
