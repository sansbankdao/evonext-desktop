// src-tauri/src/dapi/client/methods/tokens/tests.rs

use super::*;

#[test]
fn test_token_balance_formatting() {
    // 1.5 DASH (8 decimals)
    assert_eq!(DAPIClient::format_token_balance(150_000_000, 8), "1.5");
    // 100 DASH (exact)
    assert_eq!(DAPIClient::format_token_balance(10_000_000_000, 8), "100");
    // Small fraction
    assert_eq!(DAPIClient::format_token_balance(1, 8), "0.00000001");
}
#[test]
fn test_token_amount_parsing() {
    assert_eq!(DAPIClient::parse_token_amount("1.5", 8), Some(150_000_000));
    assert_eq!(DAPIClient::parse_token_amount("100", 8), Some(10_000_000_000));
    assert_eq!(DAPIClient::parse_token_amount("0.00000001", 8), Some(1));
    assert_eq!(DAPIClient::parse_token_amount("invalid", 8), None);
}
