// src-tauri/src/commands/crypto_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};

#[tokio::test]
async fn test_hash160_accuracy() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();
    // Input: "test"
    let input = b"test".to_vec();
    // Expected Hash160 (sha256 then ripemd160):
    // sha256("test") = 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
    // ripemd160(prev) = 5e0034606771a37c0f16d516223e7587747e9086
    let result = hash160(handle, input).await.unwrap();
    assert_eq!(hex::encode(result), "5e0034606771a37c0f16d516223e7587747e9086");
}
#[tokio::test]
async fn test_random_bytes_generation() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();
    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let len = 32;
    let bytes = random_bytes(handle, len).await.unwrap();
    assert_eq!(bytes.len(), len);
    // Highly unlikely to generate all zeros
    assert!(bytes.iter().any(|&b| b != 0));
}
