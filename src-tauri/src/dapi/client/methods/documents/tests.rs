// src-tauri/src/dapi/client/methods/documents/tests.rs

use super::helpers::*;
use serde_json::json;
use chrono::{Utc, Duration};

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

    let old_ms = (Utc::now() - Duration::hours(5)).timestamp_millis().to_string();
    let doc_old = json!({ "createdAt": old_ms });
    assert_eq!(format_post_time(&doc_old), "5h ago");
}
