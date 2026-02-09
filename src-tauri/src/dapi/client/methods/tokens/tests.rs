// src-tauri/src/dapi/client/methods/tokens/tests.rs

use super::*;

#[test]
fn test_token_balance_formatting() {
    // 1.5 DASH (8 decimals) - Input raw balance as String
    assert_eq!(DAPIClient::format_token_balance("150000000", 8), "1.5");

    // 100 DASH (exact)
    assert_eq!(DAPIClient::format_token_balance("10000000000", 8), "100");

    // Small fraction
    assert_eq!(DAPIClient::format_token_balance("1", 8), "0.00000001");

    // Zero balance
    assert_eq!(DAPIClient::format_token_balance("0", 8), "0");
}

#[test]
fn test_token_amount_parsing() {
    // 1.5 human -> 150000000 raw string
    assert_eq!(DAPIClient::parse_token_amount("1.5", 8), Some("150000000".to_string()));

    // 100 human -> 10000000000 raw string
    assert_eq!(DAPIClient::parse_token_amount("100", 8), Some("10000000000".to_string()));

    // 0.00000001 human -> 1 raw string
    assert_eq!(DAPIClient::parse_token_amount("0.00000001", 8), Some("1".to_string()));

    // Invalid input
    assert_eq!(DAPIClient::parse_token_amount("invalid", 8), None);

    // Too many decimals (should truncate)
    assert_eq!(DAPIClient::parse_token_amount("1.1234567899", 8), Some("112345678".to_string()));
}
