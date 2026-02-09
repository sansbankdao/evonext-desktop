// src-tauri/src/commands/crypto_commands/tests.rs

use super::*;
use tauri::test::{mock_builder, mock_context, MockRuntime, noop_assets};
use tauri::AppHandle;

#[test]
fn test_hash160_logic() {
    let app = mock_builder()
        .build(mock_context(noop_assets()))
        .unwrap();

    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let input = b"hello".to_vec();

    let result = hash160_inner(handle, input).unwrap();

    assert_eq!(result.len(), 20);
}

#[test]
fn test_random_bytes_logic() {
    let app = mock_builder()
        .build(mock_context(noop_assets()))
        .unwrap();

    let handle: AppHandle<MockRuntime> = app.handle().clone();
    let len: u32 = 32;

    let bytes = random_bytes_inner(handle, len).unwrap();

    assert_eq!(bytes.len(), len as usize);
}
