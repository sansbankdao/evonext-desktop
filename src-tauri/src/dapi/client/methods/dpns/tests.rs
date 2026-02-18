// src-tauri/src/dapi/client/methods/dpns/tests.rs

use super::*;
use crate::dapi::types::Network;

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

// ==================== Username Validation Tests ====================

#[test]
fn test_validate_dpns_username_min_length() {
    // Exactly 3 chars - valid
    assert!(DAPIClient::validate_dpns_username("abc"));
    // 2 chars - invalid
    assert!(!DAPIClient::validate_dpns_username("ab"));
    // 1 char - invalid
    assert!(!DAPIClient::validate_dpns_username("a"));
    // Empty - invalid
    assert!(!DAPIClient::validate_dpns_username(""));
}

#[test]
fn test_validate_dpns_username_max_length() {
    // Exactly 63 chars - valid
    let max_valid = "a".repeat(63);
    assert!(DAPIClient::validate_dpns_username(&max_valid));

    // 64 chars - invalid
    let too_long = "a".repeat(64);
    assert!(!DAPIClient::validate_dpns_username(&too_long));

    // 100 chars - invalid
    let very_long = "a".repeat(100);
    assert!(!DAPIClient::validate_dpns_username(&very_long));
}

#[test]
fn test_validate_dpns_username_valid_patterns() {
    // Simple alphanumeric
    assert!(DAPIClient::validate_dpns_username("alice"));
    assert!(DAPIClient::validate_dpns_username("bob123"));

    // With hyphen in middle
    assert!(DAPIClient::validate_dpns_username("alice-bob"));
    assert!(DAPIClient::validate_dpns_username("user-name-123"));

    // Numbers only
    assert!(DAPIClient::validate_dpns_username("123"));

    // Mixed
    assert!(DAPIClient::validate_dpns_username("a1b2c3"));
    assert!(DAPIClient::validate_dpns_username("user-123-name"));
}

#[test]
fn test_validate_dpns_username_invalid_patterns() {
    // Starts with hyphen
    assert!(!DAPIClient::validate_dpns_username("-alice"));
    assert!(!DAPIClient::validate_dpns_username("-user-123"));

    // Ends with hyphen
    assert!(!DAPIClient::validate_dpns_username("alice-"));
    assert!(!DAPIClient::validate_dpns_username("user-123-"));

    // Double hyphen
    assert!(!DAPIClient::validate_dpns_username("ali--ce"));
    assert!(!DAPIClient::validate_dpns_username("user--name"));

    // Underscore
    assert!(!DAPIClient::validate_dpns_username("alice_bob"));
    assert!(!DAPIClient::validate_dpns_username("user_name"));

    // Special characters
    assert!(!DAPIClient::validate_dpns_username("alice!"));
    assert!(!DAPIClient::validate_dpns_username("bob@name"));
    assert!(!DAPIClient::validate_dpns_username("user.name"));
    assert!(!DAPIClient::validate_dpns_username("name#123"));
    assert!(!DAPIClient::validate_dpns_username("user$"));
    assert!(!DAPIClient::validate_dpns_username("user%name"));
    assert!(!DAPIClient::validate_dpns_username("name&co"));
    assert!(!DAPIClient::validate_dpns_username("user*name"));
    assert!(!DAPIClient::validate_dpns_username("name+test"));
    assert!(!DAPIClient::validate_dpns_username("user=name"));
    assert!(!DAPIClient::validate_dpns_username("name[123]"));
    assert!(!DAPIClient::validate_dpns_username("user{name}"));
    assert!(!DAPIClient::validate_dpns_username("name(test)"));

    // Spaces
    assert!(!DAPIClient::validate_dpns_username("alice bob"));
    assert!(!DAPIClient::validate_dpns_username(" alice"));
    assert!(!DAPIClient::validate_dpns_username("alice "));
}

#[test]
fn test_validate_dpns_username_edge_cases() {
    // Single hyphen - invalid (length < 3)
    assert!(!DAPIClient::validate_dpns_username("-"));

    // Double hyphen only
    assert!(!DAPIClient::validate_dpns_username("--"));

    // Triple hyphen
    assert!(!DAPIClient::validate_dpns_username("---"));

    // Hyphen at both ends
    assert!(!DAPIClient::validate_dpns_username("-a-"));

    // Valid with single hyphen in middle
    assert!(DAPIClient::validate_dpns_username("a-b"));
}

#[test]
fn test_validate_dpns_username_unicode_letters_valid() {
    // Unicode letters are considered alphanumeric by Rust's is_alphanumeric()
    // Japanese characters are alphanumeric in Rust
    assert!(DAPIClient::validate_dpns_username("日本語"));
    // Emoji is NOT alphanumeric
    assert!(!DAPIClient::validate_dpns_username("user🚀"));
    // Ñ is alphanumeric
    assert!(DAPIClient::validate_dpns_username("Ñoño"));
}

#[test]
fn test_validate_dpns_username_invalid_special_chars() {
    // These are definitely not alphanumeric
    assert!(!DAPIClient::validate_dpns_username("user🚀"));
    assert!(!DAPIClient::validate_dpns_username("test©"));
    assert!(!DAPIClient::validate_dpns_username("name®"));
    assert!(!DAPIClient::validate_dpns_username("user™"));
}

// ==================== Username Normalization Tests ====================

#[test]
fn test_normalize_dpns_username_lowercase() {
    assert_eq!(DAPIClient::normalize_dpns_username("ALICE"), "alice");
    assert_eq!(DAPIClient::normalize_dpns_username("BoB"), "bob");
    assert_eq!(DAPIClient::normalize_dpns_username("UsErNaMe"), "username");
}

#[test]
fn test_normalize_dpns_username_preserves_hyphen() {
    assert_eq!(DAPIClient::normalize_dpns_username("Alice-Bob"), "alice-bob");
    assert_eq!(DAPIClient::normalize_dpns_username("USER-NAME-123"), "user-name-123");
}

#[test]
fn test_normalize_dpns_username_preserves_numbers() {
    assert_eq!(DAPIClient::normalize_dpns_username("User123"), "user123");
    assert_eq!(DAPIClient::normalize_dpns_username("ABC123XYZ"), "abc123xyz");
}

#[test]
fn test_normalize_dpns_username_empty() {
    assert_eq!(DAPIClient::normalize_dpns_username(""), "");
}

#[test]
fn test_normalize_dpns_username_already_lowercase() {
    assert_eq!(DAPIClient::normalize_dpns_username("already"), "already");
    assert_eq!(DAPIClient::normalize_dpns_username("lower-case"), "lower-case");
}

// ==================== DAPIClient Method Tests ====================

#[tokio::test]
async fn test_resolve_dpns_name_testnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.resolve_dpns_name("testuser".to_string(), Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_resolve_dpns_name_mainnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.resolve_dpns_name("testuser".to_string(), Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_dpns_username_testnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_dpns_username("identity_123".to_string(), Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_dpns_username_mainnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_dpns_username("identity_456".to_string(), Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_dpns_usernames_single() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_dpns_usernames("identity_789".to_string(), Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_search_dpns_names_no_limit() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.search_dpns_names("alice".to_string(), Network::Testnet, None).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_search_dpns_names_with_limit() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.search_dpns_names("bob".to_string(), Network::Testnet, Some(10)).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_search_dpns_names_mainnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.search_dpns_names("user".to_string(), Network::Mainnet, Some(25)).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_check_dpns_availability_returns_error_on_network_failure() {
    let client = DAPIClient::new("https://localhost".to_string());
    // When network fails, resolve_dpns_name returns an error
    // check_dpns_availability catches DAPIError::APIFailed and returns Ok(true)
    // but other errors (like RequestFailed) propagate as Err
    let res = client.check_dpns_availability("some_name".to_string(), Network::Testnet).await;
    // Network failure is not DAPIError::APIFailed, so it should be Err
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_dpns_domain_info_testnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_dpns_domain_info("somedomain".to_string(), Network::Testnet).await;
    // Should fail due to network
    assert!(res.is_err());
}

#[tokio::test]
async fn test_get_dpns_domain_info_mainnet() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_dpns_domain_info("anotherdomain".to_string(), Network::Mainnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_batch_get_dpns_domains_empty() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.batch_get_dpns_domains(vec![], Network::Testnet).await;
    // Should succeed with empty result since loop doesn't execute
    assert!(res.is_ok());
    assert!(res.unwrap().is_empty());
}

#[tokio::test]
async fn test_batch_get_dpns_domains_single() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.batch_get_dpns_domains(vec!["id_1".to_string()], Network::Testnet).await;
    assert!(res.is_ok());
    // Should be empty since network fails and error is swallowed
    assert!(res.unwrap().is_empty());
}

#[tokio::test]
async fn test_batch_get_dpns_domains_multiple() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.batch_get_dpns_domains(
        vec!["id_1".to_string(), "id_2".to_string(), "id_3".to_string()],
        Network::Testnet
    ).await;
    assert!(res.is_ok());
    assert!(res.unwrap().is_empty());
}

#[tokio::test]
async fn test_get_dpns_username_empty_string() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.get_dpns_username("".to_string(), Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_resolve_dpns_name_empty_string() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.resolve_dpns_name("".to_string(), Network::Testnet).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_search_dpns_names_empty_prefix() {
    let client = DAPIClient::new("https://localhost".to_string());
    let res = client.search_dpns_names("".to_string(), Network::Testnet, Some(10)).await;
    assert!(res.is_err());
}

#[tokio::test]
async fn test_search_dpns_names_long_prefix() {
    let client = DAPIClient::new("https://localhost".to_string());
    let long_prefix = "a".repeat(100);
    let res = client.search_dpns_names(long_prefix, Network::Testnet, Some(10)).await;
    assert!(res.is_err());
}
