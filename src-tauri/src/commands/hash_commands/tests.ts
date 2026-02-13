// src-tauri/src/commands/hash_commands/tests.rs

use super::*;

#[test]
fn test_hash160_logic_basic() {
    // Test with known input "hello"
    let input = b"hello".to_vec();
    let result = hash160_logic(input).unwrap();

    // hash160 = ripemd160(sha256(data))
    // sha256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    // ripemd160 of above = 40ab7b9c9419c557aae30df8b04c107e9813b18d
    let expected = vec![
        0x40, 0xab, 0x7b, 0x9c, 0x94, 0x19, 0xc5, 0x57,
        0xaa, 0xe3, 0x0d, 0xf8, 0xb0, 0x4c, 0x10, 0x7e,
        0x98, 0x13, 0xb1, 0x8d
    ];

    assert_eq!(result, expected);
    assert_eq!(result.len(), 20); // RIPEMD-160 is 20 bytes
}

#[test]
fn test_hash160_logic_empty() {
    let result = hash160_logic(vec![]).unwrap();
    assert_eq!(result.len(), 20);

    // Test that empty input produces consistent hash
    let result2 = hash160_logic(vec![]).unwrap();
    assert_eq!(result, result2);
}

#[test]
fn test_hash160_logic_different_inputs() {
    let input1 = b"test1".to_vec();
    let input2 = b"test2".to_vec();

    let result1 = hash160_logic(input1).unwrap();
    let result2 = hash160_logic(input2).unwrap();

    // Different inputs should produce different hashes
    assert_ne!(result1, result2);
    assert_eq!(result1.len(), 20);
    assert_eq!(result2.len(), 20);
}
