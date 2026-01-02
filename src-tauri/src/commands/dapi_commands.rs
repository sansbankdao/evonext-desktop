// src-tauri/src/commands/dapi_commands.rs

use tauri::command;
use serde_json::{Value, json};
use std::collections::HashMap;

use crate::dapi::client::{get_dapi_client, MethodParamInfo};
use crate::dapi::types::{Network};
// use crate::dapi::client::{get_dapi_client, DAPIClient, MethodParamInfo};
// use crate::dapi::types::{Network, DAPIError};

#[command]
pub async fn dapi_request(
    method: String,
    params: HashMap<String, Value>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    // Determine network
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet // Default to testnet
    };

    // Convert HashMap params to Vec<Value> for DAPI array format
    let method_info = match MethodParamInfo::for_method(&method) {
        Ok(info) => info,
        Err(e) => return Err(e.to_string()),
    };

    let mut params_array = Vec::new();

    // Convert params hashmap to array in the correct order
    for param_name in &method_info.required_params {
        if let Some(value) = params.get(*param_name) {
            params_array.push(value.clone());
        } else {
            // For missing required params, push null
            params_array.push(Value::Null);
        }
    }

    let client = get_dapi_client();

    match client.request::<Value>(method.clone(), params_array, current_network).await {
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

    match client.get_documents(
        data_contract_id,
        document_type,
        current_network,
        where_clause,
        order_by,
        limit,
        None,
        None,
    ).await {
        Ok(docs) => Ok(docs),
        Err(e) => {
            tracing::error!("Failed to get posts: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn get_identity_info(
    identity_id: String,
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    match client.get_identity(identity_id, current_network, with_proof).await {
        Ok(identities) => {
            let values: Vec<Value> = identities.into_iter()
                .map(|i| serde_json::to_value(i).unwrap_or_default())
                .collect();
            Ok(values)
        },
        Err(e) => {
            tracing::error!("Failed to get identity info: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_identity_balance(
    identity_id: String,
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    let method = if with_proof {
        "get_identity_balance_with_proof_info".to_string()
    } else {
        "get_identity_balance".to_string()
    };

    let params = vec![
        Value::String(identity_id),
    ];

    match client.request::<Value>(method, params, current_network).await {
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
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    match client.get_identity_token_balances(identity_id, token_ids, current_network, with_proof).await {
        Ok(balances) => {
            let values: Vec<Value> = balances.into_iter()
                .map(|b| serde_json::to_value(b).unwrap_or_default())
                .collect();
            Ok(values)
        },
        Err(e) => {
            tracing::error!("Failed to get token balances: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn resolve_dpns_name(
    username: String,
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    match client.resolve_dpns_name(username, current_network, with_proof).await {
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
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    match client.get_dpns_username(identity_id, current_network, with_proof).await {
        Ok(result) => Ok(result),
        Err(e) => {
            tracing::error!("Failed to get DPNS username: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_platform_status(
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };

    let params = vec![];
    match client.request::<Value>("get_status".to_string(), params, current_network).await {
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
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    let method = if with_proof {
        "get_identities_balances_with_proof_info".to_string()
    } else {
        "get_identities_balances".to_string()
    };

    let ids_array: Vec<Value> = identity_ids.into_iter().map(Value::String).collect();
    let params = vec![
        Value::Array(ids_array),
    ];

    match client.request::<Value>(method, params, current_network).await {
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
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    let method = if with_proof {
        "data_contract_fetch_with_proof_info".to_string()
    } else {
        "data_contract_fetch".to_string()
    };

    let params = vec![
        Value::String(contract_id),
    ];

    match client.request::<Value>(method, params, current_network).await {
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
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    let method = if with_proof {
        "get_token_contract_info_with_proof_info".to_string()
    } else {
        "get_token_contract_info".to_string()
    };

    let params = vec![
        Value::String(contract_id),
    ];

    match client.request::<Value>(method, params, current_network).await {
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
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    let method = if with_proof {
        "get_token_statuses_with_proof_info".to_string()
    } else {
        "get_token_statuses".to_string()
    };

    let token_ids_array: Vec<Value> = token_ids.into_iter().map(Value::String).collect();
    let params = vec![
        Value::Array(token_ids_array),
    ];

    match client.request::<Value>(method, params, current_network).await {
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
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    let method = if with_proof {
        "get_token_total_supply_with_proof_info".to_string()
    } else {
        "get_token_total_supply".to_string()
    };

    let params = vec![
        Value::String(token_id),
    ];

    match client.request::<Value>(method, params, current_network).await {
        Ok(supply) => Ok(supply),
        Err(e) => {
            tracing::error!("Failed to get token total supply: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_current_epoch(
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    let method = if with_proof {
        "get_current_epoch_with_proof_info".to_string()
    } else {
        "get_current_epoch".to_string()
    };

    let params = vec![];

    match client.request::<Value>(method, params, current_network).await {
        Ok(epoch) => Ok(epoch),
        Err(e) => {
            tracing::error!("Failed to get current epoch: {}", e);
            Err(e.to_string())
        }
    }
}

#[command]
pub async fn get_total_credits_in_platform(
    with_proof: Option<bool>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = if let Some(network_str) = network {
        Network::from_str(&network_str).unwrap_or(Network::Testnet)
    } else {
        Network::Testnet
    };
    let with_proof = with_proof.unwrap_or(false);

    let method = if with_proof {
        "get_total_credits_in_platform_with_proof_info".to_string()
    } else {
        "get_total_credits_in_platform".to_string()
    };

    let params = vec![];

    match client.request::<Value>(method, params, current_network).await {
        Ok(credits) => Ok(credits),
        Err(e) => {
            tracing::error!("Failed to get total credits: {}", e);
            Err(e.to_string())
        }
    }
}

// Add to src-tauri/src/commands/dapi_commands.rs
// use serde::Deserialize;

// #[derive(Deserialize)]
// struct DAPIParams {
//     method: String,
//     params: Vec<serde_json::Value>,
//     network: String,
// }

#[tauri::command]
pub async fn get_identity_by_public_key_hash(
    public_key_hash: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {  // Changed to Vec<Value>
    let client = get_dapi_client();
    let network_value = network.unwrap_or_else(|| "testnet".to_string());
    let network_enum = Network::from_str(&network_value).unwrap_or(Network::Testnet);
    let params = vec![json!(public_key_hash)];

    match client.request::<Value>("get_identity_by_public_key_hash".to_string(), params, network_enum).await {
        Ok(result) => {
            // FIX: client.request returns Vec<Value>, so result is a Vec.
            // We check if the vector is empty instead of matching against Value::Null.
            let is_empty = result.is_empty();

            if is_empty {
                println!("[DAPI_DEBUG]   WARNING: Result is empty/null");
                // Return empty array for not found
                Ok(vec![])
            } else {
                // Return as array with the wrapped result
                let response = json!({
                    "success": true,
                    "method": "get_identity_by_public_key_hash",
                    "params": [public_key_hash],
                    "network": network_value,
                    "result": result
                });
                println!("[DAPI_DEBUG]   Returning success response with data");
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
            println!("[DAPI_DEBUG]   Returning error response: {}", error_response);
            Ok(vec![error_response])
        }
    }
}

#[tauri::command]
pub async fn get_identity_by_non_unique_public_key_hash(
    public_key_hash: String,
    network: Option<String>,
) -> Result<Vec<Value>, String> {  // Changed to Vec<Value>
    let client = get_dapi_client();
    let network_value = network.unwrap_or_else(|| "testnet".to_string());
    let network_enum = Network::from_str(&network_value).unwrap_or(Network::Testnet);
    let params = vec![json!(public_key_hash)];

    match client.request::<Value>("get_identity_by_non_unique_public_key_hash".to_string(), params, network_enum).await {
        Ok(result) => {
            // FIX: client.request returns Vec<Value>, so result is a Vec.
            // We check if the vector is empty instead of matching against Value::Null.
            let is_empty = result.is_empty();

            if is_empty {
                println!("[DAPI_DEBUG]   WARNING: Result is empty/null");
                // Return empty array for not found
                Ok(vec![])
            } else {
                // Return as array with the wrapped result
                let response = json!({
                    "success": true,
                    "method": "get_identity_by_non_unique_public_key_hash",
                    "params": [public_key_hash],
                    "network": network_value,
                    "result": result
                });
                println!("[DAPI_DEBUG]   Returning success response with data");
                Ok(vec![response])
            }
        }
        Err(e) => {
            tracing::error!("Failed to get identity by non-unique public key hash: {}", e);
            let error_response = json!({
                "success": false,
                "method": "get_identity_by_non_unique_public_key_hash",
                "params": [public_key_hash],
                "network": network_value,
                "error": e.to_string()
            });
            println!("[DAPI_DEBUG]   Returning error response: {}", error_response);
            Ok(vec![error_response])
        }
    }
}

#[tauri::command]
pub async fn get_identity_by_id(
    identity_id: String,
    network: Option<String>,
) -> Result<serde_json::Value, String> {
    let client = get_dapi_client();
    let network_value = network.unwrap_or_else(|| "testnet".to_string());
    let network_enum = Network::from_str(&network_value).unwrap_or(Network::Testnet);

    // Use the client.request method (not make_request)
    let params = vec![json!(identity_id)];

    match client.request::<serde_json::Value>("getIdentity".to_string(), params, network_enum).await {
        Ok(result) => {
            // Wrap in the expected response format
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

// Helper function to convert params from array to object format
pub fn params_array_to_object(method: &str, params_array: Vec<Value>) -> Result<HashMap<String, Value>, String> {
    let method_info = MethodParamInfo::for_method(method)
        .map_err(|e| e.to_string())?;

    let mut params = HashMap::new();

    for (i, param_value) in params_array.into_iter().enumerate() {
        if i < method_info.required_params.len() {
            let param_name = method_info.required_params[i];
            params.insert(param_name.to_string(), param_value);
        } else {
            // We could handle optional params here, but for now just break
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
    // Convert array params to object params
    let params = params_array_to_object(&method, params_array)?;

    // Call the object-based request
    dapi_request(method, params, network).await
}
