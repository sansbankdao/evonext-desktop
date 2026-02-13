// src-tauri/src/commands/studio_commands/tests.rs

use super::*;
use serde_json::json;
use mockito::{mock, server_url};
use reqwest::Client;

#[tokio::test]
async fn test_ask_vibe_terminal_success() {
    // Setup mock server
    let mock = mock("POST", "/v1/studio/domino")
        .match_header("authorization", "Bearer 5d719800-2ac3-4f73-a47a-21cd8304640e")
        .match_body(mockito::Matcher::Json(json!({
            "convoid": "test-convo-id",
            "context": "test-context",
            "prompt": "test-prompt"
        })))
        .with_status(200)
        .with_body(r#"{
            "result": {
                "convoid": "test-convo-id",
                "model": "test-model",
                "response": "test-response",
                "createdAt": "2024-01-01T00:00:00Z"
            }
        }"#)
        .create();

    let client = Client::new();
    let server_url = server_url();

    // Test the inner function with mock server
    let result = ask_vibe_terminal_inner(
        &client,
        "5d719800-2ac3-4f73-a47a-21cd8304640e",
        &server_url,
        "test-convo-id".to_string(),
        "test-context".to_string(),
        "test-prompt".to_string(),
    ).await;

    mock.assert();

    assert!(result.is_ok());
    assert_eq!(result.unwrap(), "test-response");
}

#[tokio::test]
async fn test_ask_vibe_terminal_http_error() {
    let mock = mock("POST", "/v1/studio/domino")
        .with_status(500)
        .with_body("Internal Server Error")
        .create();

    let client = Client::new();
    let server_url = server_url();

    let result = ask_vibe_terminal_inner(
        &client,
        "5d719800-2ac3-4f73-a47a-21cd8304640e",
        &server_url,
        "test-convo-id".to_string(),
        "test-context".to_string(),
        "test-prompt".to_string(),
    ).await;

    mock.assert();

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("error"));
}

#[tokio::test]
async fn test_ask_vibe_terminal_invalid_json_response() {
    let mock = mock("POST", "/v1/studio/domino")
        .with_status(200)
        .with_body("invalid json")
        .create();

    let client = Client::new();
    let server_url = server_url();

    let result = ask_vibe_terminal_inner(
        &client,
        "5d719800-2ac3-4f73-a47a-21cd8304640e",
        &server_url,
        "test-convo-id".to_string(),
        "test-context".to_string(),
        "test-prompt".to_string(),
    ).await;

    mock.assert();

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("json"));
}

#[test]
fn test_vibe_request_serialization() {
    let request = VibeRequest {
        convoid: "test-convo".to_string(),
        context: "test-context".to_string(),
        prompt: "test-prompt".to_string(),
    };

    let json = serde_json::to_string(&request).unwrap();
    let expected = r#"{"convoid":"test-convo","context":"test-context","prompt":"test-prompt"}"#;
    assert_eq!(json, expected);
}

#[test]
fn test_vibe_response_deserialization() {
    let json = r#"{
        "result": {
            "convoid": "test-id",
            "model": "test-model",
            "response": "test-response",
            "createdAt": "2024-01-01T00:00:00Z"
        }
    }"#;

    let response: VibeResponse = serde_json::from_str(json).unwrap();
    assert_eq!(response.result.convoid, "test-id");
    assert_eq!(response.result.model, "test-model");
    assert_eq!(response.result.response, "test-response");
    assert_eq!(response.result.created_at, "2024-01-01T00:00:00Z");
}

#[test]
fn test_vibe_struct_camelcase_deserialization() {
    let json = r#"{
        "convoid": "test-id",
        "model": "test-model",
        "response": "test-response",
        "createdAt": "2024-01-01T00:00:00Z"
    }"#;

    let vibe: Vibe = serde_json::from_str(json).unwrap();
    assert_eq!(vibe.convoid, "test-id");
    assert_eq!(vibe.model, "test-model");
    assert_eq!(vibe.response, "test-response");
    assert_eq!(vibe.created_at, "2024-01-01T00:00:00Z");
}
