// src-tauri/src/commands/dapi_commands.rs

use crate::dapi::client::{get_dapi_client, MethodParamInfo};
use crate::dapi::types::Network;
use serde_json::{json, Value};
use std::collections::HashMap;
use tauri::command;

#[command]
pub async fn dapi_request(
    method: String,
    params: HashMap<String, Value>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    println!("[RUST-DEBUG] dapi_request: method={}, params={:?}", method, params);
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] dapi_request method={} network={}",
        method,
        current_network.as_str()
    );
    let method_info = match MethodParamInfo::for_method(&method) {
        Ok(info) => info,
        Err(e) => return Err(e.to_string()),
    };
    let mut params_array = Vec::new();
    for param_name in &method_info.required_params {
        if let Some(value) = params.get(*param_name) {
            params_array.push(value.clone());
        } else {
            params_array.push(Value::Null);
        }
    }
    let client = get_dapi_client();
    match client
        .request::<Value>(method.clone(), params_array, current_network)
        .await
    {
        Ok(result) => Ok(result),
        Err(e) => {
            tracing::error!("DAPI request failed for {}: {}", method, e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_posts(
    data_contract_id: String,
    document_type: String,
    where_clause: Option<Value>,
    order_by: Option<Value>,
    limit: Option<u32>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };

    // LOGGING: Verify Input
    println!(
        "[COMMAND] get_posts | Network: {} | Contract ID: {} | Type: {}",
        current_network.as_str(),
        data_contract_id,
        document_type
    );

    match client
        .get_documents(
            data_contract_id,
            document_type.clone(),
            current_network,
            where_clause,
            order_by,
            limit,
            None,
            None,
        )
        .await
    {
        Ok(docs) => {
            // =========================================================================
            // DEBUG LOGGING: Inspect Profile and Domain responses
            // =========================================================================
            if document_type == "profile" {
                println!("[PROFILE_DEBUG] Success. Count: {}", docs.len());
                if docs.len() > 0 {
                    let first = &docs[0];
                    println!("[PROFILE_DEBUG] Raw JSON: {}", serde_json::to_string(first).unwrap_or_default());

                    // Check specifically for avatar and display name
                    let has_avatar = first.get("avatar").is_some() || first.get("avatarUrl").is_some();
                    let has_name = first.get("displayName").is_some();
                    println!("[PROFILE_DEBUG] Has Avatar?: {} | Has Name?: {}", has_avatar, has_name);
                } else {
                    println!("[PROFILE_DEBUG] Response is EMPTY.");
                }
            }

            if document_type == "domain" {
                println!("[DOMAIN_DEBUG] Success. Count: {}", docs.len());
                if docs.len() > 0 {
                    let first = &docs[0];
                    println!("[DOMAIN_DEBUG] Raw JSON: {}", serde_json::to_string(first).unwrap_or_default());

                    let has_label = first.get("label").is_some();
                    println!("[DOMAIN_DEBUG] Has Label?: {}", has_label);
                } else {
                    println!("[DOMAIN_DEBUG] Response is EMPTY.");
                }
            }

            Ok(docs)
        }
        Err(e) => {
            tracing::error!("Failed to get posts: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_identity_info(
    identity_id: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_identity_info network={}",
        current_network.as_str()
    );
    match client
        .get_identity(identity_id, current_network)
        .await
    {
        Ok(identities) => {
            let values: Vec<Value> = identities
                .into_iter()
                .map(|i| serde_json::to_value(i).unwrap_or_default())
                .collect();
            Ok(values)
        }
        Err(e) => {
            tracing::error!("Failed to get identity info: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_identity_balance(
    identity_id: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_identity_balance network={}",
        current_network.as_str()
    );
    let method = "get_identity_balance".to_string();
    let params = vec![Value::String(identity_id)];
    match client
        .request::<Value>(method, params, current_network)
        .await
    {
        Ok(balances) => Ok(balances),
        Err(e) => {
            tracing::error!("Failed to get identity balance: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_token_balances(
    identity_id: String,
    token_ids: Vec<String>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_token_balances network={}",
        current_network.as_str()
    );
    match client
        .get_identity_token_balances(identity_id, token_ids, current_network)
        .await
    {
        Ok(balances) => Ok(balances),
        Err(e) => {
            tracing::error!("Failed to get token balances: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn resolve_dpns_name(
    username: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] resolve_dpns_name network={}",
        current_network.as_str()
    );
    match client
        .resolve_dpns_name(username, current_network)
        .await
    {
        Ok(result) => Ok(result),
        Err(e) => {
            tracing::error!("Failed to resolve DPNS name: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_dpns_username(
    identity_id: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_dpns_username network={}",
        current_network.as_str()
    );
    match client
        .get_dpns_username(identity_id, current_network)
        .await
    {
        Ok(result) => Ok(result),
        Err(e) => {
            tracing::error!("Failed to get DPNS username: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_dpns_usernames(
    identity_id: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_dpns_usernames network={}",
        current_network.as_str()
    );
    match client
        .get_dpns_usernames(identity_id, current_network)
        .await
    {
        Ok(result) => Ok(result),
        Err(e) => {
            tracing::error!("Failed to get DPNS usernames: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_platform_status(network: Option<String>) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_platform_status network={}",
        current_network.as_str()
    );
    let params = vec![];
    match client
        .request::<Value>("get_status".to_string(), params, current_network)
        .await
    {
        Ok(status) => Ok(status),
        Err(e) => {
            tracing::error!("Failed to get platform status: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_identities_balances(
    identity_ids: Vec<String>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_identities_balances network={}",
        current_network.as_str()
    );
    let method = "get_identities_balances".to_string();
    let ids_array: Vec<Value> = identity_ids.into_iter().map(Value::String).collect();
    let params = vec![Value::Array(ids_array)];
    match client
        .request::<Value>(method, params, current_network)
        .await
    {
        Ok(balances) => Ok(balances),
        Err(e) => {
            tracing::error!("Failed to get identities balances: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_data_contract_info(
    contract_id: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_data_contract_info network={}",
        current_network.as_str()
    );
    let method = "data_contract_fetch".to_string();
    let params = vec![Value::String(contract_id)];
    match client
        .request::<Value>(method, params, current_network)
        .await
    {
        Ok(contracts) => Ok(contracts),
        Err(e) => {
            tracing::error!("Failed to get data contract info: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_token_contract_info(
    contract_id: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_token_contract_info network={}",
        current_network.as_str()
    );
    let method = "get_token_contract_info".to_string();
    let params = vec![Value::String(contract_id)];
    match client
        .request::<Value>(method, params, current_network)
        .await
    {
        Ok(contracts) => Ok(contracts),
        Err(e) => {
            tracing::error!("Failed to get token contract info: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_token_statuses(
    token_ids: Vec<String>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_token_statuses network={}",
        current_network.as_str()
    );
    let method = "get_token_statuses".to_string();
    let token_ids_array: Vec<Value> = token_ids.into_iter().map(Value::String).collect();
    let params = vec![Value::Array(token_ids_array)];
    match client
        .request::<Value>(method, params, current_network)
        .await
    {
        Ok(statuses) => Ok(statuses),
        Err(e) => {
            tracing::error!("Failed to get token statuses: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_total_supply(
    token_id: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_total_supply network={}",
        current_network.as_str()
    );
    let method = "get_token_total_supply".to_string();
    let params = vec![Value::String(token_id)];
    match client
        .request::<Value>(method, params, current_network)
        .await
    {
        Ok(supply) => Ok(supply),
        Err(e) => {
            tracing::error!("Failed to get token total supply: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_current_epoch(
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_current_epoch network={}",
        current_network.as_str()
    );
    let method = "get_current_epoch".to_string();
    let params = vec![];
    match client
        .request::<Value>(method, params, current_network)
        .await
    {
        Ok(epoch) => Ok(epoch),
        Err(e) => {
            tracing::error!("Failed to get current epoch: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_total_credits_in_platform(
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    println!(
        "[DEBUG DAPI] get_total_credits_in_platform network={}",
        current_network.as_str()
    );
    let params = vec![];
    match client
        .request::<Value>(
            "get_total_credits_in_platform".to_string(),
            params,
            current_network,
        )
        .await
    {
        Ok(credits) => Ok(credits),
        Err(e) => {
            tracing::error!("Failed to get total credits: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_identity_by_public_key_hash(
    public_key_hash: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    println!("[RUST-DEBUG] get_identity_by_public_key_hash: hash={}", public_key_hash);
    let client = get_dapi_client();
    let network_value = network.unwrap_or_else(|| "testnet".to_string());
    let network_enum = Network::from_str(&network_value).unwrap_or(Network::Testnet);
    println!(
        "[DEBUG DAPI] get_identity_by_public_key_hash network={}",
        network_enum.as_str()
    );
    let params = vec![json!(public_key_hash)];
    match client
        .request::<Value>(
            "get_identity_by_public_key_hash".to_string(),
            params,
            network_enum,
        )
        .await
    {
        Ok(result) => {
            let is_empty = result.is_empty();
            if is_empty {
                Ok(vec![])
            } else {
                let response = json!({
                    "success": true,
                    "method": "get_identity_by_public_key_hash",
                    "params": [public_key_hash],
                    "network": network_value,
                    "result": result
                });
                Ok(vec![response])
            }
        }
        Err(e) => {
            tracing::error!("Failed to get identity by public key hash: {}", e);
            let error_response = json!({
                "success": false,
                "method": "get_identity_by_public_key_hash",
                "params": [public_key_hash],
                "network": network_value,
                "error": e.to_string()
            });
            Ok(vec![error_response])
        }
    }
}

#[tauri::command]
pub async fn get_identity_by_non_unique_public_key_hash(
    public_key_hash: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    println!("[RUST-DEBUG] get_identity_by_non_unique_public_key_hash: hash={}", public_key_hash);
    let client = get_dapi_client();
    let network_value = network.unwrap_or_else(|| "testnet".to_string());
    let network_enum = Network::from_str(&network_value).unwrap_or(Network::Testnet);
    println!(
        "[DEBUG DAPI] get_identity_by_non_unique_public_key_hash network={}",
        network_enum.as_str()
    );
    let params = vec![json!(public_key_hash)];
    match client
        .request::<Value>(
            "get_identity_by_non_unique_public_key_hash".to_string(),
            params,
            network_enum,
        )
        .await
    {
        Ok(result) => {
            let is_empty = result.is_empty();
            if is_empty {
                Ok(vec![])
            } else {
                let response = json!({
                    "success": true,
                    "method": "get_identity_by_non_unique_public_key_hash",
                    "params": [public_key_hash],
                    "network": network_value,
                    "result": result
                });
                Ok(vec![response])
            }
        }
        Err(e) => {
            tracing::error!(
                "Failed to get identity by non-unique public key hash: {}",
                e
            );
            let error_response = json!({
                "success": false,
                "method": "get_identity_by_non_unique_public_key_hash",
                "params": [public_key_hash],
                "network": network_value,
                "error": e.to_string()
            });
            Ok(vec![error_response])
        }
    }
}

#[tauri::command]
pub async fn get_identity_by_id(
    identity_id: String,
    network: Option<String>,
) -> Result<serde_json::Value, String> {
    println!("[RUST-DEBUG] get_identity_by_id: id={}", identity_id);
    let client = get_dapi_client();
    let network_value = network.unwrap_or_else(|| "testnet".to_string());
    let network_enum = Network::from_str(&network_value).unwrap_or(Network::Testnet);
    println!(
        "[DEBUG DAPI] get_identity_by_id network={}",
        network_enum.as_str()
    );
    let params = vec![json!(identity_id)];
    match client
        .request::<serde_json::Value>("getIdentity".to_string(), params, network_enum)
        .await
    {
        Ok(result) => {
            let response = json!({
                "success": true,
                "method": "getIdentity",
                "params": [identity_id],
                "network": network_value,
                "result": result
            });
            Ok(response)
        }
        Err(e) => {
            tracing::error!("Failed to get identity by ID: {}", e);
            let error_response = json!({
                "success": false,
                "method": "getIdentity",
                "params": [identity_id],
                "network": network_value,
                "error": e.to_string()
            });
            Ok(error_response)
        }
    }
}

pub fn params_array_to_object(
    method: &str,
    params_array: Vec<Value>,
) -> Result<HashMap<String, Value>, String> {
    let method_info = MethodParamInfo::for_method(method).map_err(|e| e.to_string())?;
    let mut params = HashMap::new();
    for (i, param_value) in params_array.into_iter().enumerate() {
        if i < method_info.required_params.len() {
            let param_name = method_info.required_params[i];
            params.insert(param_name.to_string(), param_value);
        } else {
            break;
        }
    }
    Ok(params)
}

#[command]
pub async fn dapi_request_array(
    method: String,
    params_array: Vec<Value>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let params = params_array_to_object(&method, params_array)?;
    dapi_request(method, params, network).await
}
