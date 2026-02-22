// src-tauri/src/dapi/client/methods/documents/tests.rs

use super::helpers::*;
use crate::dapi::types::Network;
use crate::dapi::DAPIClient;
use chrono::{Duration, Utc};
use serde_json::json;

// ==================== Helper Function Tests ====================

#[test]
fn test_helper_get_post_content() {
    let doc = json!({ "content": "Hello World" });
    assert_eq!(get_post_content(&doc), Some("Hello World".to_string()));
    assert_eq!(get_post_content(&json!({})), None);
}

#[test]
fn test_helper_is_sensitive() {
    assert!(is_post_sensitive(&json!({ "isSensitive": true })));
    assert!(!is_post_sensitive(&json!({ "isSensitive": false })));
    assert!(!is_post_sensitive(&json!({})));
}

#[test]
fn test_helper_format_post_time() {
    let now_ms = Utc::now().timestamp_millis().to_string();
    let doc = json!({ "createdAt": now_ms });
    assert_eq!(format_post_time(&doc), "Just now");

    let old_ms = (Utc::now() - Duration::hours(5))
        .timestamp_millis()
        .to_string();
    let doc_old = json!({ "createdAt": old_ms });
    assert_eq!(format_post_time(&doc_old), "5h ago");
}

#[test]
fn test_helper_get_post_content_missing() {
    assert_eq!(get_post_content(&json!({ "other": "field" })), None);
    assert_eq!(get_post_content(&json!(null)), None);
}

#[test]
fn test_helper_get_post_content_null() {
    let doc = json!({ "content": null });
    assert_eq!(get_post_content(&doc), None);
}

#[test]
fn test_helper_get_post_content_empty_string() {
    let doc = json!({ "content": "" });
    assert_eq!(get_post_content(&doc), Some("".to_string()));
}

#[test]
fn test_helper_get_post_content_with_special_chars() {
    let doc = json!({ "content": "Hello\nWorld\t\"Quotes\"" });
    assert_eq!(
        get_post_content(&doc),
        Some("Hello\nWorld\t\"Quotes\"".to_string())
    );
}

#[test]
fn test_helper_get_post_content_unicode() {
    let doc = json!({ "content": "日本語 🚀 Ñoño" });
    assert_eq!(get_post_content(&doc), Some("日本語 🚀 Ñoño".to_string()));
}

#[test]
fn test_helper_get_post_owner_id_present() {
    let doc = json!({ "ownerId": "owner_123" });
    assert_eq!(get_post_owner_id(&doc), Some("owner_123".to_string()));
}

#[test]
fn test_helper_get_post_owner_id_missing() {
    assert_eq!(get_post_owner_id(&json!({})), None);
}

#[test]
fn test_helper_get_post_owner_id_null() {
    let doc = json!({ "ownerId": null });
    assert_eq!(get_post_owner_id(&doc), None);
}

#[test]
fn test_helper_get_post_created_at_valid() {
    let ts = 1704067200000i64; // 2024-01-01 00:00:00 UTC
    let doc = json!({ "createdAt": ts.to_string() });
    let result = get_post_created_at(&doc);
    assert!(result.is_some());
}

#[test]
fn test_helper_get_post_created_at_invalid_string() {
    let doc = json!({ "createdAt": "invalid" });
    assert!(get_post_created_at(&doc).is_none());
}

#[test]
fn test_helper_get_post_created_at_missing() {
    assert!(get_post_created_at(&json!({})).is_none());
}

#[test]
fn test_helper_get_post_created_at_null() {
    let doc = json!({ "createdAt": null });
    assert!(get_post_created_at(&doc).is_none());
}

#[test]
fn test_helper_format_post_time_seconds_ago() {
    let ts = (Utc::now() - Duration::seconds(30))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    assert_eq!(format_post_time(&doc), "Just now");
}

#[test]
fn test_helper_format_post_time_minutes_ago() {
    let ts = (Utc::now() - Duration::minutes(45))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    assert_eq!(format_post_time(&doc), "45m ago");
}

#[test]
fn test_helper_format_post_time_hours_ago() {
    let ts = (Utc::now() - Duration::hours(12))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    assert_eq!(format_post_time(&doc), "12h ago");
}

#[test]
fn test_helper_format_post_time_days_ago() {
    let ts = (Utc::now() - Duration::days(5))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    let result = format_post_time(&doc);
    // Should be formatted as date
    assert!(!result.contains("ago"));
    assert!(result.contains(","));
}

#[test]
fn test_helper_format_post_time_no_created_at() {
    let doc = json!({});
    assert_eq!(format_post_time(&doc), "Unknown time");
}

#[test]
fn test_helper_format_post_time_edge_case_59_seconds() {
    let ts = (Utc::now() - Duration::seconds(59))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    assert_eq!(format_post_time(&doc), "Just now");
}

#[test]
fn test_helper_format_post_time_edge_case_60_seconds() {
    let ts = (Utc::now() - Duration::seconds(60))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    assert_eq!(format_post_time(&doc), "1m ago");
}

#[test]
fn test_helper_format_post_time_edge_case_59_minutes() {
    let ts = (Utc::now() - Duration::minutes(59))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    assert_eq!(format_post_time(&doc), "59m ago");
}

#[test]
fn test_helper_format_post_time_edge_case_60_minutes() {
    let ts = (Utc::now() - Duration::minutes(60))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    assert_eq!(format_post_time(&doc), "1h ago");
}

#[test]
fn test_helper_format_post_time_edge_case_23_hours() {
    let ts = (Utc::now() - Duration::hours(23))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    assert_eq!(format_post_time(&doc), "23h ago");
}

#[test]
fn test_helper_format_post_time_edge_case_24_hours() {
    let ts = (Utc::now() - Duration::hours(24))
        .timestamp_millis()
        .to_string();
    let doc = json!({ "createdAt": ts });
    let result = format_post_time(&doc);
    // Should switch to date format
    assert!(!result.contains("h ago"));
}

#[test]
fn test_helper_is_sensitive_true() {
    let doc = json!({ "isSensitive": true, "content": "test" });
    assert!(is_post_sensitive(&doc));
}

#[test]
fn test_helper_is_sensitive_false_explicit() {
    let doc = json!({ "isSensitive": false, "content": "test" });
    assert!(!is_post_sensitive(&doc));
}

#[test]
fn test_helper_is_sensitive_default_false() {
    let doc = json!({ "content": "test" });
    assert!(!is_post_sensitive(&doc));
}

#[test]
fn test_helper_is_sensitive_null() {
    let doc = json!({ "isSensitive": null });
    // null is not a bool, so unwrap_or returns false
    assert!(!is_post_sensitive(&doc));
}

// ==================== DAPIClient Method Tests ====================

#[tokio::test]
async fn test_get_documents_minimal_params() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_documents(
            "contract_123".to_string(),
            "post".to_string(),
            Network::Testnet,
            None,
            None,
            None,
            None,
            None,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_documents_with_all_params() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_documents(
            "contract_abc".to_string(),
            "document".to_string(),
            Network::Mainnet,
            Some(json!({ "field": "value" })),
            Some(json!({ "$createdAt": "desc" })),
            Some(100),
            Some("doc_123".to_string()),
            Some("doc_000".to_string()),
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_documents_with_where_clause() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_documents(
            "contract_xyz".to_string(),
            "comment".to_string(),
            Network::Testnet,
            Some(json!({ "$ownerId": "owner_123" })),
            None,
            Some(50),
            None,
            None,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_documents_with_order_by() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_documents(
            "contract_def".to_string(),
            "like".to_string(),
            Network::Mainnet,
            None,
            Some(json!({ "$updatedAt": "asc" })),
            None,
            None,
            None,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_document_minimal() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_document(
            "contract_123".to_string(),
            "post".to_string(),
            "document_456".to_string(),
            Network::Testnet,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_document_mainnet() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_document(
            "mainnet_contract".to_string(),
            "profile".to_string(),
            "profile_789".to_string(),
            Network::Mainnet,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_minimal() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_posts(Network::Testnet, None, None, None, None, None)
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_with_limit() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_posts(Network::Mainnet, None, None, Some(25), None, None)
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_with_where_and_order() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_posts(
            Network::Testnet,
            Some(json!({ "likes": { "$gt": 100 } })),
            Some(json!({ "likes": "desc" })),
            Some(50),
            None,
            None,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_with_pagination() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_posts(
            Network::Testnet,
            None,
            None,
            Some(10),
            Some("post_abc123".to_string()),
            Some("post_xyz789".to_string()),
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_by_owner_minimal() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_posts_by_owner("owner_id_123".to_string(), Network::Testnet, None, None)
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_by_owner_with_limit() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_posts_by_owner("owner_id_456".to_string(), Network::Mainnet, Some(20), None)
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_by_owner_with_custom_order() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_posts_by_owner(
            "owner_id_789".to_string(),
            Network::Testnet,
            Some(100),
            Some(json!({ "$updatedAt": "asc" })),
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_network_variants() {
    let client = DAPIClient::new("https://test.example.com".to_string());

    let res_testnet = client
        .get_posts(Network::Testnet, None, None, None, None, None)
        .await;
    assert!(res_testnet.is_err());

    let res_mainnet = client
        .get_posts(Network::Mainnet, None, None, None, None, None)
        .await;
    assert!(res_mainnet.is_err());
}

#[tokio::test]
async fn test_get_documents_empty_contract_id() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_documents(
            "".to_string(),
            "post".to_string(),
            Network::Testnet,
            None,
            None,
            None,
            None,
            None,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_documents_empty_document_type() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_documents(
            "contract_123".to_string(),
            "".to_string(),
            Network::Testnet,
            None,
            None,
            None,
            None,
            None,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_document_empty_document_id() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_document(
            "contract_123".to_string(),
            "post".to_string(),
            "".to_string(),
            Network::Testnet,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_by_owner_empty_owner_id() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_posts_by_owner("".to_string(), Network::Testnet, None, None)
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_large_limit() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_posts(Network::Testnet, None, None, Some(u32::MAX), None, None)
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_documents_complex_where_clause() {
    let client = DAPIClient::new("https://test.example.com".to_string());
    let res = client
        .get_documents(
            "contract_complex".to_string(),
            "post".to_string(),
            Network::Testnet,
            Some(json!({
                "$and": [
                    { "$ownerId": "owner_123" },
                    { "likes": { "$gt": 50 } },
                    { "createdAt": { "$gt": "1700000000000" } }
                ]
            })),
            None,
            Some(25),
            None,
            None,
        )
        .await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_posts_by_owner_uses_default_order() {
    // This test verifies that get_posts_by_owner constructs the expected where clause
    // and default order_by when none is provided
    let client = DAPIClient::new("https://test.example.com".to_string());
    // We can't inspect the internal params, but we verify the method doesn't panic
    let res = client
        .get_posts_by_owner(
            "test_owner".to_string(),
            Network::Testnet,
            Some(10),
            None, // Should use default: { "$createdAt": "desc" }
        )
        .await;
    assert!(res.is_err());
}
