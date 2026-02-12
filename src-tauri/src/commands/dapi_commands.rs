// src-tauri/src/commands/dapi_commands.rs

use crate::dapi::client::{get_dapi_client, MethodParamInfo, params_array_to_object};
use crate::dapi::types::Network;
use crate::models::{ICommandResult};
use crate::cmd_res;
use serde::{Serialize, Deserialize};
use serde_json::{json, Value};
use specta::Type;
use std::collections::HashMap;

#[cfg(test)]
mod tests;

#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DapiPublicKey {
    pub purpose: u8,
    pub security_level: u8,
    pub key_type: String,
    pub data: String,
    pub data_b64: String,
    pub read_only: bool,
    pub disabled_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DapiIdentityResponse {
    pub identity_id: String,
    pub public_key_hash: String,
    pub balance: String,
    pub revision: String,
    pub public_keys: Vec<DapiPublicKey>,
}

fn extract_first_as_response(res: Vec<Value>) -> Result<DapiIdentityResponse, String> {
    let first = res.get(0)
        .ok_or_else(|| "DAPI returned an empty result".to_string())?;

    let mut target = if let Some(inner) = first.get("result") {
        inner.clone()
    } else {
        first.clone()
    };

    // Fix Borrow Checker Error E0502:
    // Extract the string representation BEFORE mutating the object
    if let Some(keys) = target.get_mut("publicKeys").and_then(|k| k.as_array_mut()) {
        for key in keys {
            let disabled_val = key.get("disabledAt").and_then(|d| {
                if d.is_number() { Some(d.to_string()) } else { None }
            });

            if let Some(val_string) = disabled_val {
                if let Some(obj) = key.as_object_mut() {
                    obj.insert("disabledAt".to_string(), json!(val_string));
                }
            }
        }
    }

    serde_json::from_value(target.clone())
        .map_err(|e| format!("Serialization error: {}. Raw: {}", e, target))
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_by_public_key_hash(
    _app: tauri::AppHandle,
    public_key_hash: String,
    network: Option<String>
) -> ICommandResult<DapiIdentityResponse> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);

    cmd_res!(async {
        let res = client.request::<Value>(
            "get_identity_by_public_key_hash".to_string(),
            vec![json!(public_key_hash)],
            n
        ).await.map_err(|e| e.to_string())?;
        extract_first_as_response(res)
    }.await)
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_by_non_unique_public_key_hash(
    _app: tauri::AppHandle,
    public_key_hash: String,
    network: Option<String>
) -> ICommandResult<DapiIdentityResponse> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);

    cmd_res!(async {
        let res = client.request::<Value>(
            "get_identity_by_non_unique_public_key_hash".to_string(),
            vec![json!(public_key_hash)],
            n
        ).await.map_err(|e| e.to_string())?;
        extract_first_as_response(res)
    }.await)
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_info(
    _app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> ICommandResult<DapiIdentityResponse> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);

    cmd_res!(async {
        let res = client.request::<Value>(
            "getIdentity".to_string(),
            vec![json!(identity_id)],
            n
        ).await.map_err(|e| e.to_string())?;
        extract_first_as_response(res)
    }.await)
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_by_id(
    _app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> ICommandResult<Value> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);

    cmd_res!(client.request::<Value>("getIdentity".to_string(), vec![json!(identity_id)], n)
        .await
        .map(|v| json!(v))
        .map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_dpns_username(
    _app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> ICommandResult<Option<String>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);

    cmd_res!(match client.get_dpns_username(identity_id, n).await {
        Ok(vec) => Ok(vec.get(0).and_then(|v| v.as_str()).map(|s| s.to_string())),
        Err(e) => Err(e.to_string()),
    })
}

#[tauri::command]
#[specta::specta]
pub async fn dapi_request_array(
    _app: tauri::AppHandle,
    method: String,
    params_array: Vec<Value>,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);

    cmd_res!(async {
        let _validated_params = params_array_to_object(&method, params_array.clone())
            .map_err(|e| e.to_string())?;
        client.request::<Value>(method, params_array, n)
            .await
            .map_err(|e| e.to_string())
    }.await)
}

#[tauri::command]
#[specta::specta]
pub async fn get_token_balances(
    _app: tauri::AppHandle,
    identity_id: String,
    token_ids: Vec<String>,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.get_identity_token_balances(identity_id, token_ids, n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn resolve_dpns_name(
    _app: tauri::AppHandle,
    username: String,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.resolve_dpns_name(username, n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_platform_status(
    _app: tauri::AppHandle,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.request::<Value>("get_status".to_string(), vec![], n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_identities_balances(
    _app: tauri::AppHandle,
    identity_ids: Vec<String>,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.request::<Value>("get_identities_balances".to_string(), vec![json!(identity_ids)], n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_data_contract_info(
    _app: tauri::AppHandle,
    contract_id: String,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.request::<Value>("data_contract_fetch".to_string(), vec![json!(contract_id)], n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_token_contract_info(
    _app: tauri::AppHandle,
    contract_id: String,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.request::<Value>("get_token_contract_info".to_string(), vec![json!(contract_id)], n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_token_statuses(
    _app: tauri::AppHandle,
    token_ids: Vec<String>,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.request::<Value>("get_token_statuses".to_string(), vec![json!(token_ids)], n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_total_supply(
    _app: tauri::AppHandle,
    token_id: String,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.request::<Value>("get_token_total_supply".to_string(), vec![json!(token_id)], n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_current_epoch(
    _app: tauri::AppHandle,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.request::<Value>("get_current_epoch".to_string(), vec![], n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_total_credits_in_platform(
    _app: tauri::AppHandle,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.request::<Value>("get_total_credits_in_platform".to_string(), vec![], n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn dapi_request(
    _app: tauri::AppHandle,
    method: String,
    params: HashMap<String, Value>,
    network: Option<String>,
) -> ICommandResult<Vec<Value>> {
    let current_network = network.and_then(|n| Network::from_str(&n)).unwrap_or(Network::Testnet);

    cmd_res!(async {
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
        client.request::<Value>(method, params_array, current_network).await.map_err(|e| e.to_string())
    }.await)
}

#[tauri::command]
#[specta::specta]
pub async fn get_posts(
    _app: tauri::AppHandle,
    data_contract_id: String,
    document_type: String,
    where_clause: Option<Value>,
    order_by: Option<Value>,
    limit: Option<u32>,
    network: Option<String>,
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.get_documents(data_contract_id, document_type, n, where_clause, order_by, limit, None, None).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_identity_balance(
    _app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.request::<Value>("get_identity_balance".to_string(), vec![json!(identity_id)], n).await.map_err(|e| e.to_string()))
}

#[tauri::command]
#[specta::specta]
pub async fn get_dpns_usernames(
    _app: tauri::AppHandle,
    identity_id: String,
    network: Option<String>
) -> ICommandResult<Vec<Value>> {
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    cmd_res!(client.get_dpns_usernames(identity_id, n).await.map_err(|e| e.to_string()))
}
