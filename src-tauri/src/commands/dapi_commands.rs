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
/// Represents a public key as returned by the DAPI Web API endpoint.
/// Note: Purpose and SecurityLevel are strings ("AUTHENTICATION", "MASTER", etc.)
/// not numeric codes, as per the Web API response format.
#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DapiPublicKey {
    pub purpose: String,
    pub security_level: String,
    pub key_type: String,
    pub data: String,
    pub data_b64: String,
    pub read_only: bool,
    pub disabled_at: Option<String>,
}

/// Represents an Identity as returned by the DAPI Web API endpoint.
/// The Web API wrapper transforms raw responses into this camelCase format.
#[derive(Debug, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DapiIdentityResponse {
    pub identity_id: String,
    /// This field is often null in responses, as the public key hash is an input
    /// parameter, not a property of the identity itself.
    #[serde(default)]
    pub public_key_hash: Option<String>,
    pub balance: String,
    pub revision: String,
    #[serde(default)]
    pub public_keys: Vec<DapiPublicKey>,
}

fn extract_first_as_response(res: Vec<Value>) -> Result<DapiIdentityResponse, String> {
    let first = res.get(0)
        .ok_or_else(|| "DAPI returned an empty result".to_string())?;

    // Handle error responses (success: false)
    if let Some(success) = first.get("success") {
        if success == false {
            // Extract error message if available
            let error_msg = first.get("error")
                .and_then(|e| e.as_str())
                .unwrap_or("DAPI returned success=false");
            return Err(format!("DAPI error: {}", error_msg));
        }
    }

    let mut target = if let Some(inner) = first.get("result") {
        inner.clone()
    } else {
        first.clone()
    };
    // Handle potential numeric disabledAt in publicKeys
    if let Some(keys) = target.get_mut("publicKeys").and_then(|k| k.as_array_mut()) {
        for key in keys {
            if let Some(obj) = key.as_object_mut() {
                // Convert numeric disabledAt to string if present
                if let Some(d) = obj.get("disabledAt") {
                    if d.is_number() {
                        obj.insert("disabledAt".to_string(), json!(d.to_string()));
                    }
                }
                // Ensure purpose/securityLevel are strings (API returns strings, but be defensive)
                for field in &["purpose", "securityLevel"] {
                    if let Some(val) = obj.get(*field) {
                        if val.is_number() {
                            if let Some(s) = val.as_u64().map(|n| purpose_code_to_string(n as u8)) {
                                obj.insert(field.to_string(), json!(s));
                            }
                        }
                    }
                }
            }
        }
    }
    // Ensure defaults for optional fields
    if let Some(obj) = target.as_object_mut() {
        if !obj.contains_key("publicKeys") {
            obj.insert("publicKeys".to_string(), json!([]));
        }
        if !obj.contains_key("publicKeyHash") {
            obj.insert("publicKeyHash".to_string(), json!(null));
        }
    }
    serde_json::from_value(target.clone())
        .map_err(|e| format!("Serialization error: {}. Raw: {}", e, target))
}

/// Converts numeric purpose codes to their string representations.
/// Used for normalizing responses if DAPI returns numeric codes.
fn purpose_code_to_string(code: u8) -> String {
    match code {
        0 => "AUTHENTICATION".to_string(),
        1 => "ENCRYPTION".to_string(),
        2 => "DECRYPTION".to_string(),
        3 => "TRANSFER".to_string(),
        _ => format!("UNKNOWN_{}", code),
    }
}
#[tauri::command]
#[specta::specta]
pub async fn get_identity_by_public_key_hash(
    _app: tauri::AppHandle,
    public_key_hash: String,
    network: Option<String>
) -> ICommandResult<DapiIdentityResponse> {
    println!("[RUST DEBUG] get_identity_by_public_key_hash called: hash={}, network={:?}", public_key_hash, network);
    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);

    cmd_res!(async {
        let res = client.request::<Value>(
            "get_identity_by_public_key_hash".to_string(),
            vec![json!(public_key_hash)],
            n
        ).await.map_err(|e| e.to_string())?;
        println!("[RUST DEBUG] get_identity_by_public_key_hash raw response: {:?}", res);
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
    println!("[RUST DEBUG] get_identity_by_non_unique_public_key_hash START: hash={}, network={:?}", public_key_hash, network);

    let client = get_dapi_client();
    let n = network.and_then(|val| Network::from_str(&val)).unwrap_or(Network::Testnet);
    println!("[RUST DEBUG] Using network: {:?}", n);

    let result = async {
        println!("[RUST DEBUG] Calling DAPI with method: get_identity_by_non_unique_public_key_hash");
        let res = client.request::<Value>(
            "get_identity_by_non_unique_public_key_hash".to_string(),
            vec![json!(public_key_hash)],
            n
        ).await.map_err(|e| {
            println!("[RUST DEBUG] DAPI request error: {}", e);
            e.to_string()
        })?;

        println!("[RUST DEBUG] DAPI raw response: {:?}", res);

        let extracted = extract_first_as_response(res);
        println!("[RUST DEBUG] Extracted response: {:?}", extracted);

        extracted
    }.await;

    println!("[RUST DEBUG] get_identity_by_non_unique_public_key_hash END: result={:?}", result);

    cmd_res!(result)
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
            "get_identity".to_string(),
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

    cmd_res!(client.request::<Value>("get_identity".to_string(), vec![json!(identity_id)], n)
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
    cmd_res!(dapi_request_inner(method, params, network).await)
}

pub async fn dapi_request_inner(
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
    client.request::<Value>(method, params_array, current_network).await.map_err(|e| e.to_string())
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
