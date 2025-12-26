// src-tauri/src/dapi/client/methods/documents.rs

use serde_json::Value;
use std::collections::HashMap;
use chrono::{DateTime, Utc};

use crate::dapi::types::{DAPIError, Network};
use super::super::DAPIClient;

impl DAPIClient {
    /// Fetch documents from a data contract
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

        // Add optional parameters
        if let Some(where_clause) = where_clause {
            params.push(where_clause);
        } else {
            params.push(Value::Null);
        }

        if let Some(order_by) = order_by {
            params.push(order_by);
        } else {
            params.push(Value::Null);
        }

        if let Some(limit) = limit {
            params.push(Value::Number(limit.into()));
        } else {
            params.push(Value::Null);
        }

        if let Some(start_after) = start_after {
            params.push(Value::String(start_after));
        } else {
            params.push(Value::Null);
        }

        if let Some(start_at) = start_at {
            params.push(Value::String(start_at));
        } else {
            params.push(Value::Null);
        }

        self.request("get_documents".to_string(), params, network).await
    }

    /// Fetch a specific document by ID
    pub async fn get_document(
        &self,
        data_contract_id: String,
        document_type: String,
        document_id: String,
        network: Network,
        with_proof: bool,
    ) -> Result<Vec<Value>, DAPIError> {
        let method = if with_proof {
            "get_document_with_proof_info".to_string()
        } else {
            "get_document".to_string()
        };

        let params = vec![
            Value::String(data_contract_id),
            Value::String(document_type),
            Value::String(document_id),
        ];

        self.request(method, params, network).await
    }

    /// Fetch posts from the EvoNext contract
    pub async fn get_posts(
        &self,
        network: Network,
        where_clause: Option<Value>,
        order_by: Option<Value>,
        limit: Option<u32>,
        start_after: Option<String>,
        start_at: Option<String>,
    ) -> Result<Vec<Value>, DAPIError> {
        // Get contract IDs from constants
        let contract_id = match network {
            Network::Mainnet => "6fBkKSne1xQ5GCPW9fdwEkH7nk8oYPu48vYiYssWzhX8", // EVONEXT_CONTRACT_ID_MAINNET
            Network::Testnet => "465jdPpFCZefhb4g2k2FpCcrKpPYhJJskDqbGFsKu6wb", // EVONEXT_CONTRACT_ID_TESTNET
        };

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

    /// Fetch posts by a specific owner
    pub async fn get_posts_by_owner(
        &self,
        owner_id: String,
        network: Network,
        limit: Option<u32>,
        order_by: Option<Value>,
    ) -> Result<Vec<Value>, DAPIError> {
        let where_clause = Some(serde_json::json!({
            "$ownerId": owner_id
        }));

        let order_by = order_by.unwrap_or_else(|| {
            serde_json::json!({
                "$createdAt": "desc"
            })
        });

        self.get_posts(network, where_clause, Some(order_by), limit, None, None).await
    }

    /// Fetch recent posts with optional filters
    pub async fn get_recent_posts(
        &self,
        network: Network,
        limit: Option<u32>,
        language: Option<String>,
        is_sensitive: Option<bool>,
        hashtag: Option<String>,
    ) -> Result<Vec<Value>, DAPIError> {
        let mut where_clause = HashMap::new();

        if let Some(lang) = language {
            where_clause.insert("language".to_string(), Value::String(lang));
        }

        if let Some(sensitive) = is_sensitive {
            where_clause.insert("isSensitive".to_string(), Value::Bool(sensitive));
        }

        if let Some(tag) = hashtag {
            where_clause.insert("hashtag".to_string(), Value::String(tag));
        }

        let where_value = if where_clause.is_empty() {
            None
        } else {
            Some(Value::Object(where_clause.into_iter().collect()))
        };

        let order_by = serde_json::json!({
            "$createdAt": "desc"
        });

        self.get_posts(network, where_value, Some(order_by), limit, None, None).await
    }

    /// Search posts by content
    pub async fn search_posts(
        &self,
        query: String,
        network: Network,
        limit: Option<u32>,
    ) -> Result<Vec<Value>, DAPIError> {
        let where_clause = Some(serde_json::json!({
            "content": {
                "$like": format!("%{}%", query)
            }
        }));

        let order_by = serde_json::json!({
            "$createdAt": "desc"
        });

        self.get_posts(network, where_clause, Some(order_by), limit, None, None).await
    }

    /// Get posts with media attachments
    pub async fn get_posts_with_media(
        &self,
        network: Network,
        limit: Option<u32>,
    ) -> Result<Vec<Value>, DAPIError> {
        let where_clause = Some(serde_json::json!({
            "mediaUrl": {
                "$exists": true
            }
        }));

        let order_by = serde_json::json!({
            "$createdAt": "desc"
        });

        self.get_posts(network, where_clause, Some(order_by), limit, None, None).await
    }
}

/// Helper functions for working with post documents
pub mod helpers {
    use serde_json::Value;
    use chrono::{DateTime, Utc};

    /// Extract content from a post document
    pub fn get_post_content(doc: &Value) -> Option<String> {
        doc.get("content")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }

    /// Extract owner ID from a post document
    pub fn get_post_owner_id(doc: &Value) -> Option<String> {
        doc.get("ownerId")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }

    /// Extract creation timestamp from a post document
    pub fn get_post_created_at(doc: &Value) -> Option<DateTime<Utc>> {
        doc.get("createdAt")
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<i64>().ok())
            .map(|ts| {
                let millis = ts as i64;
                DateTime::from_timestamp_millis(millis).unwrap_or_else(|| Utc::now())
            })
    }

    /// Check if post is sensitive
    pub fn is_post_sensitive(doc: &Value) -> bool {
        doc.get("isSensitive")
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
    }

    /// Get post language
    pub fn get_post_language(doc: &Value) -> Option<String> {
        doc.get("language")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }

    /// Get post media URLs
    pub fn get_post_media_urls(doc: &Value) -> Vec<String> {
        doc.get("mediaUrl")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(|s| s.to_string()))
                    .collect()
            })
            .unwrap_or_default()
    }

    /// Get post hashtag
    pub fn get_post_hashtag(doc: &Value) -> Option<String> {
        doc.get("hashtag")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
    }

    /// Format post timestamp as relative time
    pub fn format_post_time(doc: &Value) -> String {
        if let Some(created_at) = get_post_created_at(doc) {
            let now = Utc::now();
            let duration = now.signed_duration_since(created_at);

            if duration.num_seconds() < 60 {
                "Just now".to_string()
            } else if duration.num_minutes() < 60 {
                format!("{}m ago", duration.num_minutes())
            } else if duration.num_hours() < 24 {
                format!("{}h ago", duration.num_hours())
            } else if duration.num_days() < 7 {
                format!("{}d ago", duration.num_days())
            } else {
                created_at.format("%b %d, %Y").to_string()
            }
        } else {
            "Unknown time".to_string()
        }
    }
}
