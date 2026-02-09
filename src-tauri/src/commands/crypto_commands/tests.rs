// src-tauri/src/commands/crypto_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};
use tauri::AppHandle;

#[test]
fn test_hash160_logic() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();

    // Fixed: Added .clone() to get the owned AppHandle
    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let input = b"hello".to_vec();

    // Call the inner generic function to satisfy MockRuntime
    let result = hash160_inner(handle, input).unwrap();
    assert_eq!(result.len(), 20);
}

#[test]
fn test_random_bytes_logic() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();

    // Fixed: Added .clone() to get the owned AppHandle
    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let len = 32;

    let bytes = random_bytes_inner(handle, len).unwrap();
    assert_eq!(bytes.len(), len);
}
