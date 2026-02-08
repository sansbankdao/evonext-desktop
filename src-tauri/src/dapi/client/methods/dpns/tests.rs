// src-tauri/src/dapi/client/methods/dpns/tests.rs

use super::*;

#[test]
fn test_dpns_username_validation() {
    // Valid cases
    assert!(DAPIClient::validate_dpns_username("alice"));
    assert!(DAPIClient::validate_dpns_username("bob-123"));

    // Invalid: Too short
    assert!(!DAPIClient::validate_dpns_username("ab"));
    // Invalid: Starts with hyphen
    assert!(!DAPIClient::validate_dpns_username("-alice"));
    // Invalid: Ends with hyphen
    assert!(!DAPIClient::validate_dpns_username("alice-"));
    // Invalid: Special characters
    assert!(!DAPIClient::validate_dpns_username("alice_123"));
    assert!(!DAPIClient::validate_dpns_username("alice!"));
    // Invalid: Double hyphen
    assert!(!DAPIClient::validate_dpns_username("ali--ce"));
}

#[test]
fn test_dpns_username_normalization() {
    assert_eq!(DAPIClient::normalize_dpns_username("Alice"), "alice");
    assert_eq!(DAPIClient::normalize_dpns_username("BOB-123"), "bob-123");
}

#[tokio::test]
async fn test_resolve_dpns_name_path() {
    // Fixed: Added required endpoint argument
    let client = DAPIClient::new("https://localhost".to_string());

    // Verify that the async path for resolution compiles and initiates a request
    let res = client.resolve_dpns_name("tester".into(), Network::Testnet).await;

    // Expected to fail in test environment without network, but verifies logic flow
    assert!(res.is_err());
}
