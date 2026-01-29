// src-tauri/src/commands/documents_commands.rs

use super::dapi_core::{log_network_operation, resolve_network};
use crate::dapi::client::get_dapi_client;
use crate::dapi::types::Network;
use serde_json::Value;
use tauri::AppHandle;
use tauri::command;

#[command]
pub async fn get_posts(
    app_handle: AppHandle,
    data_contract_id: String,
    document_type: String,
    where_clause: Option<Value>,
    order_by: Option<Value>,
    limit: Option<u32>,
    network: Option<String>,
) -> Result<Vec<Value>, String> {
    let current_network = resolve_network(network);
    log_network_operation("get_posts", &current_network);
    println!(
        "[COMMAND] get_posts | Network: {} | Contract ID: {} | Type: {}",
        current_network.as_str(),
        data_contract_id,
        document_type
    );

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
