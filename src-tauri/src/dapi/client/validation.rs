// src-tauri/src/dapi/client/validation.rs

use serde_json::Value;
use std::collections::HashMap;
use tracing::warn;
use crate::dapi::types::DAPIError;

#[derive(Debug, Clone)]
pub struct MethodParamInfo {
    pub required_params: Vec<&'static str>,
    pub param_types: HashMap<&'static str, &'static str>,
}

impl MethodParamInfo {
    pub fn for_method(method: &str) -> Result<Self, DAPIError> {
        let info = match method {
            "get_documents" | "getDocuments" => MethodParamInfo {
                required_params: vec!["dataContractId", "documentType"],
                param_types: HashMap::from([
                    ("dataContractId", "string"),
                    ("documentType", "string"),
                    ("whereClause", "object"),
                    ("orderBy", "object"),
                    ("limit", "number"),
                    ("startAfter", "string"),
                    ("startAt", "string"),
                ]),
            },
            "get_document" | "getDocument" => MethodParamInfo {
                required_params: vec!["dataContractId", "documentType", "documentId"],
                param_types: HashMap::from([
                    ("dataContractId", "string"),
                    ("documentType", "string"),
                    ("documentId", "string"),
                ]),
            },
            "getIdentity" | "identity_fetch" | "get_identity" => MethodParamInfo {
                required_params: vec!["identityId"],
                param_types: HashMap::from([("identityId", "string")]),
            },
            "get_identity_balance" | "getIdentityBalance" => MethodParamInfo {
                required_params: vec!["identityId"],
                param_types: HashMap::from([("identityId", "string")]),
            },
            "get_identity_by_public_key_hash" | "getIdentityByPublicKeyHash" => MethodParamInfo {
                required_params: vec!["publicKeyHash"],
                param_types: HashMap::from([("publicKeyHash", "string")]),
            },
            "get_identity_by_non_unique_public_key_hash" | "getIdentityByNonUniquePublicKeyHash" => MethodParamInfo {
                required_params: vec!["publicKeyHash"],
                param_types: HashMap::from([("publicKeyHash", "string")]),
            },
            "get_identity_token_balances" | "getIdentityTokenBalances" => MethodParamInfo {
                required_params: vec!["identityId", "tokenIds"],
                param_types: HashMap::from([("identityId", "string"), ("tokenIds", "array")]),
            },
            "data_contract_fetch" | "getDataContract" => MethodParamInfo {
                required_params: vec!["contractId"],
                param_types: HashMap::from([("contractId", "string")]),
            },
            "dpns_resolve_name" | "resolve_dpns_name" | "get_dpns_username_by_name" => MethodParamInfo {
                required_params: vec!["username"],
                param_types: HashMap::from([("username", "string")]),
            },
            "get_dpns_username" | "get_dpns_usernames" => MethodParamInfo {
                required_params: vec!["identityId"],
                param_types: HashMap::from([("identityId", "string")]),
            },
            "get_token_contract_info" => MethodParamInfo {
                required_params: vec!["dataContractId"],
                param_types: HashMap::from([("dataContractId", "string")]),
            },
            "get_token_statuses" => MethodParamInfo {
                required_params: vec!["tokenIds"],
                param_types: HashMap::from([("tokenIds", "array")]),
            },
            "get_token_total_supply" => MethodParamInfo {
                required_params: vec!["tokenId"],
                param_types: HashMap::from([("tokenId", "string")]),
            },
            "get_status" | "getStatus" => MethodParamInfo {
                required_params: vec![],
                param_types: HashMap::new(),
            },
            "get_current_epoch" | "getCurrentEpoch" => MethodParamInfo {
                required_params: vec![],
                param_types: HashMap::new(),
            },
            "get_total_credits_in_platform" => MethodParamInfo {
                required_params: vec![],
                param_types: HashMap::new(),
            },
            _ => return Err(DAPIError::UnknownMethod(method.to_string())),
        };
        Ok(info)
    }
}

pub fn validate_dapi_params(method: &str, params: &HashMap<String, Value>) -> Result<(), DAPIError> {
    let method_info = MethodParamInfo::for_method(method)?;
    for required_param in &method_info.required_params {
        if !params.contains_key(*required_param) {
            return Err(DAPIError::MissingParameter(required_param.to_string()));
        }
    }
    for (param_name, param_value) in params {
        if let Some(expected_type) = method_info.param_types.get(param_name.as_str()) {
            match *expected_type {
                "string" => if !param_value.is_string() { return Err(DAPIError::InvalidParameterType(param_name.clone(), "string".into(), format!("{:?}", param_value))); },
                "number" => if !param_value.is_number() { return Err(DAPIError::InvalidParameterType(param_name.clone(), "number".into(), format!("{:?}", param_value))); },
                "array" => if !param_value.is_array() { return Err(DAPIError::InvalidParameterType(param_name.clone(), "array".into(), format!("{:?}", param_value))); },
                "object" => if !param_value.is_object() && !param_value.is_null() { return Err(DAPIError::InvalidParameterType(param_name.clone(), "object".into(), format!("{:?}", param_value))); },
                "boolean" => if !param_value.is_boolean() { return Err(DAPIError::InvalidParameterType(param_name.clone(), "boolean".into(), format!("{:?}", param_value))); },
                _ => warn!("Unknown param type for {}: {}", param_name, expected_type),
            }
        }
    }
    Ok(())
}

pub fn params_array_to_object(method: &str, params_array: Vec<Value>) -> Result<HashMap<String, Value>, DAPIError> {
    let method_info = MethodParamInfo::for_method(method)?;
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
