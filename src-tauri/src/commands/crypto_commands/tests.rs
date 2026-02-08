// src-tauri/src/commands/crypto_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};

#[tokio::test]
async fn test_hash160_accuracy() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();
    // Input: "test"
    let input = b"test".to_vec();
    // Correct HASH160 Calculation:
    // 1. sha256("test") = 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
    // 2. ripemd160(sha256) = cebaa98c19807134434d107b0d3e5692a516ea66
    let result = hash160(handle, input).await.unwrap();
    let hex_result = hex::encode(result);
    // This is the true HASH160 of "test"
    assert_eq!(hex_result, "cebaa98c19807134434d107b0d3e5692a516ea66");
}

#[tokio::test]
async fn test_random_bytes_generation() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let len = 32;
    let bytes = random_bytes(handle, len).await.unwrap();
    assert_eq!(bytes.len(), len);
    assert!(bytes.iter().any(|&b| b != 0));
}
