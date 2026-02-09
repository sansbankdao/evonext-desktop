// src-tauri/src/commands/dapi_commands.rs

use crate::dapi::client::{get_dapi_client, MethodParamInfo, params_array_to_object};
use crate::dapi::types::Network;
use serde_json::{json, Value};
use std::collections::HashMap;
use tauri::Runtime;
use tracing;

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub async fn dapi_request(
    app: tauri::AppHandle,
    method: String,
    params: HashMap<String, Value>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    dapi_request_inner(app, method, params, network).await
}

pub async fn dapi_request_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    method: String,
    params: HashMap<String, Value>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    let method_info = MethodParamInfo::for_method(&method).map_err(|e| e.to_string())?;

    let mut params_array = Vec::new();
    for param_name in &method_info.required_params {
        if let Some(value) = params.get(*param_name) {
            params_array.push(value.clone());
        } else {
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

#[tauri::command]
#[specta::specta]
pub async fn get_posts(
    app: tauri::AppHandle,
    data_contract_id: String,
    document_type: String,
    where_clause: Option<Value>,
    order_by: Option<Value>,
    limit: Option<u32>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    get_posts_inner(app, data_contract_id, document_type, where_clause, order_by, limit, network).await
}

pub async fn get_posts_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    data_contract_id: String,
    document_type: String,
    where_clause: Option<Value>,
    order_by: Option<Value>,
    limit: Option<u32>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);

    client.get_documents(
        data_contract_id,
        document_type,
        current_network,
        where_clause,
        order_by,
        limit,
        None,
        None
    ).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_info(
    app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_identity_info_inner(app, identity_id, network).await
}

pub async fn get_identity_info_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    identity_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    match client.get_identity(identity_id, current_network).await {
        Ok(identities) => Ok(identities.into_iter().map(|i| json!(i)).collect()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_balance(
    app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_identity_balance_inner(app, identity_id, network).await
}

pub async fn get_identity_balance_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    identity_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.request::<Value>("get_identity_balance".to_string(), vec![json!(identity_id)], current_network)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_token_balances(
    app: tauri::AppHandle,
    identity_id: String,
    token_ids: Vec<String>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_token_balances_inner(app, identity_id, token_ids, network).await
}

pub async fn get_token_balances_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    identity_id: String,
    token_ids: Vec<String>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.get_identity_token_balances(identity_id, token_ids, current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn resolve_dpns_name(
    app: tauri::AppHandle,
    username: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    resolve_dpns_name_inner(app, username, network).await
}

pub async fn resolve_dpns_name_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    username: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.resolve_dpns_name(username, current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_dpns_username(
    app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> Result<Option<String>, String> {
    get_dpns_username_inner(app, identity_id, network).await
}

pub async fn get_dpns_username_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    identity_id: String,
    network: Option<String>
) -> Result<Option<String>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    match client.get_dpns_username(identity_id, current_network).await {
        Ok(result_vec) => Ok(result_vec.get(0).and_then(|v| v.as_str()).map(|s| s.to_string())),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_dpns_usernames(
    app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_dpns_usernames_inner(app, identity_id, network).await
}

pub async fn get_dpns_usernames_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    identity_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.get_dpns_usernames(identity_id, current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_platform_status(
    app: tauri::AppHandle,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_platform_status_inner(app, network).await
}

pub async fn get_platform_status_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.request::<Value>("get_status".to_string(), vec![], current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_identities_balances(
    app: tauri::AppHandle,
    identity_ids: Vec<String>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_identities_balances_inner(app, identity_ids, network).await
}

pub async fn get_identities_balances_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    identity_ids: Vec<String>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.request::<Value>("get_identities_balances".to_string(), vec![json!(identity_ids)], current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_data_contract_info(
    app: tauri::AppHandle,
    contract_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_data_contract_info_inner(app, contract_id, network).await
}

pub async fn get_data_contract_info_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    contract_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.request::<Value>("data_contract_fetch".to_string(), vec![json!(contract_id)], current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_token_contract_info(
    app: tauri::AppHandle,
    contract_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_token_contract_info_inner(app, contract_id, network).await
}

pub async fn get_token_contract_info_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    contract_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.request::<Value>("get_token_contract_info".to_string(), vec![json!(contract_id)], current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_token_statuses(
    app: tauri::AppHandle,
    token_ids: Vec<String>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_token_statuses_inner(app, token_ids, network).await
}

pub async fn get_token_statuses_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    token_ids: Vec<String>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.request::<Value>("get_token_statuses".to_string(), vec![json!(token_ids)], current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_total_supply(
    app: tauri::AppHandle,
    token_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_total_supply_inner(app, token_id, network).await
}

pub async fn get_total_supply_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    token_id: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.request::<Value>("get_token_total_supply".to_string(), vec![json!(token_id)], current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_epoch(
    app: tauri::AppHandle,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_current_epoch_inner(app, network).await
}

pub async fn get_current_epoch_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.request::<Value>("get_current_epoch".to_string(), vec![], current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_total_credits_in_platform(
    app: tauri::AppHandle,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_total_credits_in_platform_inner(app, network).await
}

pub async fn get_total_credits_in_platform_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);
    client.request::<Value>("get_total_credits_in_platform".to_string(), vec![], current_network).await.map_err(|e| e.to_string())
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_by_public_key_hash(
    app: tauri::AppHandle,
    public_key_hash: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_identity_by_public_key_hash_inner(app, public_key_hash, network).await
}

pub async fn get_identity_by_public_key_hash_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    public_key_hash: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let network_val = network.unwrap_or_else(|| "testnet".to_string());
    let network_enum = Network::from_str(&network_val).unwrap_or(Network::Testnet);
    match client.request::<Value>("get_identity_by_public_key_hash".to_string(), vec![json!(public_key_hash)], network_enum).await {
        Ok(res) => Ok(vec![json!({ "success": true, "result": res, "network": network_val })]),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_by_non_unique_public_key_hash(
    app: tauri::AppHandle,
    public_key_hash: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    get_identity_by_non_unique_public_key_hash_inner(app, public_key_hash, network).await
}

pub async fn get_identity_by_non_unique_public_key_hash_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    public_key_hash: String,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let client = get_dapi_client();
    let network_val = network.unwrap_or_else(|| "testnet".to_string());
    let network_enum = Network::from_str(&network_val).unwrap_or(Network::Testnet);
    match client.request::<Value>("get_identity_by_non_unique_public_key_hash".to_string(), vec![json!(public_key_hash)], network_enum).await {
        Ok(res) => Ok(vec![json!({ "success": true, "result": res, "network": network_val })]),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_by_id(
    app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> Result<serde_json::Value, String> {
    get_identity_by_id_inner(app, identity_id, network).await
}

pub async fn get_identity_by_id_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    identity_id: String,
    network: Option<String>
) -> Result<serde_json::Value, String> {
    let client = get_dapi_client();
    let network_val = network.unwrap_or_else(|| "testnet".to_string());
    let network_enum = Network::from_str(&network_val).unwrap_or(Network::Testnet);
    match client.request::<Value>("getIdentity".to_string(), vec![json!(identity_id)], network_enum).await {
        Ok(res) => Ok(json!({ "success": true, "result": res })),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn dapi_request_array(
    app: tauri::AppHandle,
    method: String,
    params_array: Vec<Value>,
    network: Option<String>
) -> Result<Vec<Value>, String> {
    let params = params_array_to_object(&method, params_array).map_err(|e| e.to_string())?;
    dapi_request_inner(app, method, params, network).await
}
