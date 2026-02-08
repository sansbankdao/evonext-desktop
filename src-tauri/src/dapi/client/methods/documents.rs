// src-tauri/src/dapi/client/methods/documents.rs

use serde_json::Value;
use std::collections::HashMap;
use crate::dapi::client::DAPIClient;
use crate::constants;
use crate::dapi::types::{DAPIError, Network};

#[cfg(test)]
mod tests;

impl DAPIClient {
    pub async fn get_documents(
        &self,
        data_contract_id: String,
        document_type: String,
        network: Network,
        where_clause: Option<Value>,
        order_by: Option<Value>,
        limit: Option<u32>,
        start_after: Option<String>,
        start_at: Option<String>,
    ) -> Result<Vec<Value>, DAPIError> {
        let mut params = vec![
            Value::String(data_contract_id),
            Value::String(document_type),
        ];

        params.push(where_clause.unwrap_or(Value::Null));
        params.push(order_by.unwrap_or(Value::Null));
        params.push(limit.map(|l| Value::Number(l.into())).unwrap_or(Value::Null));
        params.push(start_after.map(Value::String).unwrap_or(Value::Null));
        params.push(start_at.map(Value::String).unwrap_or(Value::Null));

        self.request("get_documents".to_string(), params, network).await
    }

    pub async fn get_document(
        &self,
        data_contract_id: String,
        document_type: String,
        document_id: String,
        network: Network,
    ) -> Result<Vec<Value>, DAPIError> {
        let params = vec![
            Value::String(data_contract_id),
            Value::String(document_type),
            Value::String(document_id),
        ];
        self.request("get_document".to_string(), params, network).await
    }

    pub async fn get_posts(
        &self,
        network: Network,
        where_clause: Option<Value>,
        order_by: Option<Value>,
        limit: Option<u32>,
        start_after: Option<String>,
        start_at: Option<String>,
    ) -> Result<Vec<Value>, DAPIError> {
        let contract_id = constants::get_evonext_contract_id(network);
        self.get_documents(
            contract_id.to_string(),
            "post".to_string(),
            network,
            where_clause,
            order_by,
            limit,
            start_after,
            start_at,
        ).await
    }

    pub async fn get_posts_by_owner(
        &self,
        owner_id: String,
        network: Network,
        limit: Option<u32>,
        order_by: Option<Value>,
    ) -> Result<Vec<Value>, DAPIError> {
        let where_clause = Some(serde_json::json!({ "$ownerId": owner_id }));
        let order_by = order_by.unwrap_or_else(|| serde_json::json!({ "$createdAt": "desc" }));
        self.get_posts(network, where_clause, Some(order_by), limit, None, None).await
    }
}

pub mod helpers {
    use chrono::{DateTime, Utc};
    use serde_json::Value;

    pub fn get_post_content(doc: &Value) -> Option<String> {
        doc.get("content").and_then(|v| v.as_str()).map(|s| s.to_string())
    }

    pub fn get_post_owner_id(doc: &Value) -> Option<String> {
        doc.get("ownerId").and_then(|v| v.as_str()).map(|s| s.to_string())
    }

    pub fn get_post_created_at(doc: &Value) -> Option<DateTime<Utc>> {
        doc.get("createdAt")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<i64>().ok())
            .and_then(|ts| DateTime::from_timestamp_millis(ts))
    }

    pub fn is_post_sensitive(doc: &Value) -> bool {
        doc.get("isSensitive").and_then(|v| v.as_bool()).unwrap_or(false)
    }

    pub fn format_post_time(doc: &Value) -> String {
        if let Some(created_at) = get_post_created_at(doc) {
            let now = Utc::now();
            let duration = now.signed_duration_since(created_at);
            if duration.num_seconds() < 60 { "Just now".into() }
            else if duration.num_minutes() < 60 { format!("{}m ago", duration.num_minutes()) }
            else if duration.num_hours() < 24 { format!("{}h ago", duration.num_hours()) }
            else { created_at.format("%b %d, %Y").to_string() }
        } else {
            "Unknown time".into()
        }
    }
}
