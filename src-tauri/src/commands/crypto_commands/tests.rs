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

#[test]
fn test_hash160_logic_empty_input() {
    let input = Vec::new();
    let result = hash160_logic(input).unwrap();
    assert_eq!(result.len(), 20);
}

#[test]
fn test_hash160_logic_deterministic() {
    let input = b"deterministic".to_vec();
    let result1 = hash160_logic(input.clone()).unwrap();
    let result2 = hash160_logic(input).unwrap();
    assert_eq!(result1, result2);
}

#[test]
fn test_hash160_logic_different_inputs_different_outputs() {
    let r1 = hash160_logic(b"input_a".to_vec()).unwrap();
    let r2 = hash160_logic(b"input_b".to_vec()).unwrap();
    assert_ne!(r1, r2);
}

#[test]
fn test_hash160_logic_large_input() {
    let input = vec![0xFFu8; 10_000];
    let result = hash160_logic(input).unwrap();
    assert_eq!(result.len(), 20);
}

#[test]
fn test_random_bytes_logic_zero_length() {
    let bytes = random_bytes_logic(0).unwrap();
    assert_eq!(bytes.len(), 0);
}

#[test]
fn test_random_bytes_logic_one_byte() {
    let bytes = random_bytes_logic(1).unwrap();
    assert_eq!(bytes.len(), 1);
}

#[test]
fn test_random_bytes_logic_large() {
    let bytes = random_bytes_logic(1024).unwrap();
    assert_eq!(bytes.len(), 1024);
}

#[test]
fn test_random_bytes_logic_not_all_zeros() {
    // With 64 bytes, probability of all zeros is negligible
    let bytes = random_bytes_logic(64).unwrap();
    assert!(bytes.iter().any(|&b| b != 0));
}

#[test]
fn test_random_bytes_logic_different_each_call() {
    let b1 = random_bytes_logic(32).unwrap();
    let b2 = random_bytes_logic(32).unwrap();
    // Vanishingly small chance of collision
    assert_ne!(b1, b2);
}
