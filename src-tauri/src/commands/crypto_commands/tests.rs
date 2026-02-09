// src-tauri/src/commands/crypto_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, MockRuntime};
use tauri::AppHandle;

#[test]
fn test_hash160_logic() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();

    // Added .clone() to handle the MockRuntime type correctly
    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let input = b"hello".to_vec();

    // Call the inner generic function
    let result = hash160_inner(handle, input).unwrap();

    // Hash160 always returns 20 bytes
    assert_eq!(result.len(), 20);
}

#[test]
fn test_random_bytes_logic() {
    let app = mock_builder().build(tauri::generate_context!()).unwrap();

    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let len: u32 = 32; // Explicitly defined as u32 to match the new signature

    let bytes = random_bytes_inner(handle, len).unwrap();

    // FIXED: Cast 'len' to usize to match bytes.len() type
    assert_eq!(bytes.len(), len as usize);
}
