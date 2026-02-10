// src-tauri/src/commands/crypto_commands/tests.rs

use super::*;

#[test]
fn test_hash160_logic_pure() {
    let input = b"hello".to_vec();
    let result = hash160_logic(input).unwrap();
    assert_eq!(result.len(), 20);
}

#[test]
fn test_random_bytes_logic_pure() {
    let len: u32 = 32;
    let bytes = random_bytes_logic(len).unwrap();
    assert_eq!(bytes.len(), len as usize);
}
