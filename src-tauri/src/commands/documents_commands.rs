// src-tauri/src/commands/documents_commands.rs

use super::dapi_core::{log_network_operation, resolve_network};
use crate::dapi::client::get_dapi_client;
use serde_json::Value;

#[tauri::command]
pub async fn get_posts(
    _app_handle: tauri::AppHandle,
    data_contract_id: String,
    document_type: String,
    where_clause: Option<Value>,
    order_by: Option<Value>,
    limit: Option<u32>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    get_posts_logic(data_contract_id, document_type, where_clause, order_by, limit, network).await
}

pub async fn get_posts_logic(
    data_contract_id: String,
    document_type: String,
    where_clause: Option<Value>,
    order_by: Option<Value>,
    limit: Option<u32>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let current_network = resolve_network(network);
    log_network_operation("get_posts", &current_network);
    let client = get_dapi_client();
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
            if document_type == "profile" || document_type == "domain" {
                println!("[{}_DEBUG] Success. Count: {}", document_type.to_uppercase(), docs.len());
            }
            Ok(docs)
        }
        Err(e) => {
            tracing::error!("Failed to get posts: {}", e);
            Err(e.to_string())
        }
    }
}
