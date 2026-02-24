use super::*;
use serde_json::json;
use crate::cmd_res;

#[test]
fn test_de_u32_from_str_or_num() {
    // Test direct number
    let data_num = json!({
        "identityId": "id",
        "username": "u",
        "balance": "0",
        "revision": 123,
        "publicKeys": [],
        "isAuthenticated": true
    });
    let identity: IIdentityData = serde_json::from_value(data_num).unwrap();
    assert_eq!(identity.revision, 123);

    // Test string number
    let data_str = json!({
        "identityId": "id",
        "username": "u",
        "balance": "0",
        "revision": "456",
        "publicKeys": [],
        "isAuthenticated": true
    });
    let identity: IIdentityData = serde_json::from_value(data_str).unwrap();
    assert_eq!(identity.revision, 456);

    // Test empty string / null
    let data_empty = json!({
        "identityId": "id",
        "username": "u",
        "balance": "0",
        "revision": "",
        "publicKeys": [],
        "isAuthenticated": true
    });
    let identity: IIdentityData = serde_json::from_value(data_empty).unwrap();
    assert_eq!(identity.revision, 0);
}

#[test]
fn test_ianyvalue_any_type() {
    let val = IAnyValue(json!({"foo": "bar"}));
    assert_eq!(val.0["foo"], "bar");
}

// ==================== ICommandResult Tests ====================

#[test]
fn test_icommand_result_ok() {
    let result: ICommandResult<String> = ICommandResult::ok("test_data".to_string());
    assert!(result.success);
    assert_eq!(result.data, Some("test_data".to_string()));
    assert!(result.error.is_none());
}

#[test]
fn test_icommand_result_err() {
    let result: ICommandResult<String> = ICommandResult::err("Something went wrong");
    assert!(!result.success);
    assert!(result.data.is_none());
    assert_eq!(result.error, Some("Something went wrong".to_string()));
}

#[test]
fn test_icommand_result_serialization() {
    let result: ICommandResult<i32> = ICommandResult::ok(42);
    let json = serde_json::to_string(&result).unwrap();
    assert!(json.contains("\"success\":true"));
    assert!(json.contains("\"data\":42"));
}

#[test]
fn test_icommand_result_deserialization() {
    let json = r#"{"success":false,"data":null,"error":"Failed"}"#;
    let result: ICommandResult<String> = serde_json::from_str(json).unwrap();
    assert!(!result.success);
    assert_eq!(result.error, Some("Failed".to_string()));
}

#[test]
fn test_icommand_result_with_complex_data() {
    #[derive(Serialize, Deserialize, Type, PartialEq, Clone, Debug)]
    struct TestData {
        name: String,
        value: u32,
    }

    let data = TestData {
        name: "test".to_string(),
        value: 100,
    };
    let result = ICommandResult::ok(data.clone());
    assert_eq!(result.data, Some(data));
}

#[test]
fn test_icommand_result_clone() {
    let result: ICommandResult<String> = ICommandResult::ok("test".to_string());
    let cloned = result.clone();
    assert_eq!(result.success, cloned.success);
    assert_eq!(result.data, cloned.data);
}

#[test]
fn test_icommand_result_debug() {
    let result: ICommandResult<String> = ICommandResult::ok("test".to_string());
    let debug_str = format!("{:?}", result);
    assert!(debug_str.contains("ICommandResult"));
    assert!(debug_str.contains("success: true"));
}

// ==================== de_u32_from_str_or_num Extended Tests ====================

#[derive(serde::Deserialize)]
struct TestU32 {
    #[serde(deserialize_with = "de_u32_from_str_or_num")]
    value: u32,
}

#[test]
fn test_de_u32_from_number() {
    let json = json!({ "value": 42 });
    let result: TestU32 = serde_json::from_value(json).unwrap();
    assert_eq!(result.value, 42);
}

#[test]
fn test_de_u32_from_string() {
    let json = json!({ "value": "123" });
    let result: TestU32 = serde_json::from_value(json).unwrap();
    assert_eq!(result.value, 123);
}

#[test]
fn test_de_u32_from_empty_string() {
    let json = json!({ "value": "" });
    let result: TestU32 = serde_json::from_value(json).unwrap();
    assert_eq!(result.value, 0);
}

#[test]
fn test_de_u32_from_null() {
    let json = json!({ "value": null });
    let result: TestU32 = serde_json::from_value(json).unwrap();
    assert_eq!(result.value, 0);
}

#[test]
fn test_de_u32_from_zero() {
    let json = json!({ "value": 0 });
    let result: TestU32 = serde_json::from_value(json).unwrap();
    assert_eq!(result.value, 0);
}

#[test]
fn test_de_u32_from_max() {
    let json = json!({ "value": u32::MAX });
    let result: TestU32 = serde_json::from_value(json).unwrap();
    assert_eq!(result.value, u32::MAX);
}

#[test]
fn test_de_u32_from_string_max() {
    let json = json!({ "value": "4294967295" });
    let result: TestU32 = serde_json::from_value(json).unwrap();
    assert_eq!(result.value, u32::MAX);
}

#[test]
fn test_de_u32_invalid_string() {
    let json = json!({ "value": "not_a_number" });
    let result: Result<TestU32, _> = serde_json::from_value(json);
    assert!(result.is_err());
}

// ==================== INotificationSettings Tests ====================

#[test]
fn test_inotification_settings_default() {
    let settings = INotificationSettings::default();
    assert!(!settings.messages);
    assert!(!settings.mentions);
    assert!(!settings.contact_requests);
}

#[test]
fn test_inotification_settings_serialization() {
    let settings = INotificationSettings {
        messages: true,
        mentions: false,
        contact_requests: true,
    };
    let json = serde_json::to_string(&settings).unwrap();
    assert!(json.contains("\"messages\":true"));
    assert!(json.contains("\"mentions\":false"));
    assert!(json.contains("\"contactRequests\":true"));
}

#[test]
fn test_inotification_settings_deserialization() {
    let json = json!({
        "messages": true,
        "mentions": true,
        "contactRequests": false
    });
    let settings: INotificationSettings = serde_json::from_value(json).unwrap();
    assert!(settings.messages);
    assert!(settings.mentions);
    assert!(!settings.contact_requests);
}

// ==================== IProfileSettings Tests ====================

#[test]
fn test_iprofile_settings_default() {
    let settings = IProfileSettings::default();
    assert!(settings.display_name.is_empty());
    assert!(settings.username.is_empty());
    assert!(settings.bio.is_empty());
}

#[test]
fn test_iprofile_settings_serialization() {
    let settings = IProfileSettings {
        display_name: "Test User".to_string(),
        username: "testuser".to_string(),
        bio: "Hello world".to_string(),
    };
    let json = serde_json::to_string(&settings).unwrap();
    assert!(json.contains("\"displayName\":\"Test User\""));
    assert!(json.contains("\"username\":\"testuser\""));
    assert!(json.contains("\"bio\":\"Hello world\""));
}

// ==================== IAppSettings Tests ====================

#[test]
fn test_iapp_settings_serialization() {
    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: Some("id_123".to_string()),
    };
    let json = serde_json::to_string(&settings).unwrap();
    assert!(json.contains("\"network\":\"testnet\""));
    assert!(json.contains("\"activeIdentityId\":\"id_123\""));
}

#[test]
fn test_iapp_settings_deserialization() {
    let json = json!({
        "network": "mainnet",
        "theme": "light",
        "notifications": { "messages": true, "mentions": false, "contactRequests": true },
        "profile": { "displayName": "", "username": "", "bio": "" },
        "activeIdentityId": null
    });
    let settings: IAppSettings = serde_json::from_value(json).unwrap();
    assert_eq!(settings.network, "mainnet");
    assert_eq!(settings.theme, "light");
    assert!(settings.active_identity_id.is_none());
}

// ==================== IAssetDefinition Tests ====================

#[test]
fn test_iasset_definition_serialization() {
    let asset = IAssetDefinition {
        identity_id: "id123".to_string(),
        name: "Test Asset".to_string(),
        symbol: "TEST".to_string(),
        balance: Some("1000".to_string()),
        asset_id: Some("asset_123".to_string()),
        decimals: Some(8),
        network: Some("testnet".to_string()),
    };
    let json = serde_json::to_string(&asset).unwrap();
    assert!(json.contains("\"identityId\":\"id123\""));
    assert!(json.contains("\"assetId\":\"asset_123\""));
}

#[test]
fn test_iasset_definition_deserialization() {
    let json = json!({
        "identityId": "id456",
        "name": "Another Asset",
        "symbol": "ANOTHER",
        "balance": null,
        "assetId": null,
        "decimals": null,
        "network": null
    });
    let asset: IAssetDefinition = serde_json::from_value(json).unwrap();
    assert_eq!(asset.identity_id, "id456");
    assert!(asset.balance.is_none());
    assert!(asset.asset_id.is_none());
}

#[test]
fn test_iasset_definition_with_all_fields() {
    let json = json!({
        "identityId": "id789",
        "name": "Full Asset",
        "symbol": "FULL",
        "balance": "5000",
        "assetId": "asset_789",
        "decimals": 18,
        "network": "mainnet"
    });
    let asset: IAssetDefinition = serde_json::from_value(json).unwrap();
    assert_eq!(asset.identity_id, "id789");
    assert_eq!(asset.balance, Some("5000".to_string()));
    assert_eq!(asset.decimals, Some(18));
}

// ==================== IMnemonic Tests ====================

#[test]
fn test_imnemonic_serialization() {
    let mnemonic = IMnemonic {
        seed_phrase: "word1 word2 word3".to_string(),
    };
    let json = serde_json::to_string(&mnemonic).unwrap();
    assert!(json.contains("\"seedPhrase\":\"word1 word2 word3\""));
}

#[test]
fn test_imnemonic_deserialization() {
    let json = json!({ "seedPhrase": "test words here" });
    let mnemonic: IMnemonic = serde_json::from_value(json).unwrap();
    assert_eq!(mnemonic.seed_phrase, "test words here");
}

#[test]
fn test_imnemonic_default() {
    let mnemonic = IMnemonic::default();
    assert!(mnemonic.seed_phrase.is_empty());
}

// ==================== IPrivateKeyEntry Tests ====================

#[test]
fn test_iprivate_key_entry_serialization() {
    let entry = IPrivateKeyEntry {
        identity_id: "id_123".to_string(),
        key_id: 0,
        purpose: 0,
        security_level: 0,
        key_type: "ECDSA_SECP256K1".to_string(),
        private_key: "private".to_string(),
        public_key: "public".to_string(),
        created_at: "2024-01-01".to_string(),
        last_used: "2024-06-01".to_string(),
    };
    let json = serde_json::to_string(&entry).unwrap();
    assert!(json.contains("\"identityId\":\"id_123\""));
    assert!(json.contains("\"keyId\":0"));
}

#[test]
fn test_iprivate_key_entry_default() {
    let entry = IPrivateKeyEntry::default();
    assert!(entry.identity_id.is_empty());
    assert_eq!(entry.key_id, 0);
}

// ==================== IPrivateKeyStore Tests ====================

#[test]
fn test_iprivate_key_store_default() {
    let store = IPrivateKeyStore::default();
    assert!(store.identities.is_empty());
    assert!(store.mnemonic.is_none());
}

// ==================== IIdentityPublicKey Tests ====================

#[test]
fn test_iidentity_public_key_serialization() {
    let key = IIdentityPublicKey {
        id: 0,
        type_: "ECDSA_SECP256K1".to_string(),
        purpose: 0,
        security_level: 0,
        data: "0xabc".to_string(),
        read_only: false,
        disabled_at: Some("2024-01-01".to_string()),
    };
    let json = serde_json::to_string(&key).unwrap();
    assert!(json.contains("\"type\":\"ECDSA_SECP256K1\""));
    assert!(json.contains("\"disabledAt\":\"2024-01-01\""));
}

#[test]
fn test_iidentity_public_key_default() {
    let key = IIdentityPublicKey::default();
    assert_eq!(key.id, 0);
    assert!(!key.read_only);
    assert!(key.disabled_at.is_none());
}

// ==================== IIdentityData Tests ====================

#[test]
fn test_iidentity_data_default() {
    let identity = IIdentityData::default();
    assert!(identity.identity_id.is_empty());
    assert!(identity.public_keys.is_empty());
    assert!(!identity.is_authenticated);
}

#[test]
fn test_iidentity_data_serialization() {
    let identity = IIdentityData {
        identity_id: "test_id".to_string(),
        username: "testuser".to_string(),
        balance: "1000".to_string(),
        revision: 5,
        public_keys: vec![],
        identity_idx: Some(0),
        dpns_username: Some("testuser".to_string()),
        is_authenticated: true,
        created_at: Some("2024-01-01".to_string()),
        public_key_ids: Some(vec![0, 1]),
    };
    let json = serde_json::to_string(&identity).unwrap();
    assert!(json.contains("\"identityId\":\"test_id\""));
    assert!(json.contains("\"isAuthenticated\":true"));
}

#[test]
fn test_iidentity_data_deserialization() {
    let json = json!({
        "identityId": "test_id_2",
        "username": "user2",
        "balance": "2000",
        "revision": "10",
        "publicKeys": [],
        "isAuthenticated": false
    });
    let identity: IIdentityData = serde_json::from_value(json).unwrap();
    assert_eq!(identity.identity_id, "test_id_2");
    assert_eq!(identity.revision, 10);
}

// ==================== ILicense Tests ====================

#[test]
fn test_ilicense_serialization() {
    let license = ILicense {
        success: true,
        identity_id: "identity_123".to_string(),
        txid: "tx_456".to_string(),
        is_premium: true,
        created_at: "2024-01-01".to_string(),
        expires_at: "2025-01-01".to_string(),
        updated_at: Some("2024-06-01".to_string()),
    };
    let json = serde_json::to_string(&license).unwrap();
    assert!(json.contains("\"isPremium\":true"));
    assert!(json.contains("\"updatedAt\":\"2024-06-01\""));
}

#[test]
fn test_ilicense_default() {
    let license = ILicense::default();
    assert!(!license.success);
    assert!(!license.is_premium);
}

#[test]
fn test_ilicense_deserialization() {
    let json = json!({
        "success": true,
        "identityId": "id_abc",
        "txid": "tx_xyz",
        "isPremium": false,
        "createdAt": "2024-01-01",
        "expiresAt": "2025-01-01",
        "updatedAt": null
    });
    let license: ILicense = serde_json::from_value(json).unwrap();
    assert!(license.success);
    assert!(!license.is_premium);
    assert!(license.updated_at.is_none());
}

// ==================== IDiscoveredIdentity Tests ====================

#[test]
fn test_idiscovered_identity_serialization() {
    let discovered = IDiscoveredIdentity {
        identity_id: "disc_123".to_string(),
        balance: "5000".to_string(),
        identity_idx: Some(0),
        dpns_username: Some("testuser".to_string()),
        key_type: "ECDSA".to_string(),
        discovered_at: "2024-01-01T00:00:00Z".to_string(),
    };
    let json = serde_json::to_string(&discovered).unwrap();
    assert!(json.contains("\"identityId\":\"disc_123\""));
    assert!(json.contains("\"dpnsUsername\":\"testuser\""));
}

#[test]
fn test_idiscovered_identity_default() {
    let discovered = IDiscoveredIdentity::default();
    assert!(discovered.identity_id.is_empty());
    assert!(discovered.balance.is_empty());
}

#[test]
fn test_idiscovered_identity_deserialization() {
    let json = json!({
        "identityId": "disc_456",
        "balance": "3000",
        "identityIdx": 1,
        "dpnsUsername": null,
        "keyType": "BLS12_381",
        "discoveredAt": "2024-06-01T00:00:00Z"
    });
    let discovered: IDiscoveredIdentity = serde_json::from_value(json).unwrap();
    assert_eq!(discovered.identity_id, "disc_456");
    assert_eq!(discovered.identity_idx, Some(1));
}

// ==================== Type Aliases Tests ====================

#[test]
fn test_iassets_type() {
    let assets: IAssets = vec![IAssetDefinition {
        identity_id: "id1".to_string(),
        name: "Asset1".to_string(),
        symbol: "A1".to_string(),
        balance: None,
        asset_id: None,
        decimals: None,
        network: None,
    }];
    assert_eq!(assets.len(), 1);
}

#[test]
fn test_iasset_store_map_type() {
    let mut map: IAssetStoreMap = HashMap::new();
    map.insert("identity_1".to_string(), vec![]);
    assert!(map.contains_key("identity_1"));
}

#[test]
fn test_ilicense_store_map_type() {
    let mut map: ILicenseStoreMap = HashMap::new();
    map.insert("identity_1".to_string(), ILicense::default());
    assert!(map.contains_key("identity_1"));
}

// ==================== Clone & Debug Trait Tests ====================

#[test]
fn test_clone_traits() {
    let notification = INotificationSettings {
        messages: true,
        mentions: false,
        contact_requests: true,
    };
    let cloned = notification.clone();
    assert_eq!(notification, cloned);
}

#[test]
fn test_debug_traits() {
    let settings = INotificationSettings::default();
    let debug_str = format!("{:?}", settings);
    assert!(debug_str.contains("INotificationSettings"));
}

#[test]
fn test_partial_eq_traits() {
    let settings1 = INotificationSettings {
        messages: true,
        mentions: false,
        contact_requests: true,
    };
    let settings2 = INotificationSettings {
        messages: true,
        mentions: false,
        contact_requests: true,
    };
    assert_eq!(settings1, settings2);
}

// ==================== Additional Coverage Tests ====================

#[test]
fn test_iapp_settings_with_all_notification_flags_true() {
    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings {
            messages: true,
            mentions: true,
            contact_requests: true,
        },
        profile: IProfileSettings {
            display_name: "Full Name".to_string(),
            username: "fulluser".to_string(),
            bio: "Full bio text".to_string(),
        },
        active_identity_id: Some("full_id".to_string()),
    };
    let json = serde_json::to_value(&settings).unwrap();
    let roundtrip: IAppSettings = serde_json::from_value(json).unwrap();
    assert_eq!(settings, roundtrip);
}

#[test]
fn test_iprivate_key_store_with_data() {
    let mut store = IPrivateKeyStore::default();
    store.mnemonic = Some(IMnemonic {
        seed_phrase: "test phrase".into(),
    });
    store.identities.insert(
        "id1".into(),
        vec![IPrivateKeyEntry {
            identity_id: "id1".into(),
            key_id: 0,
            private_key: "priv".into(),
            ..Default::default()
        }],
    );
    let json = serde_json::to_string(&store).unwrap();
    let parsed: IPrivateKeyStore = serde_json::from_str(&json).unwrap();
    assert_eq!(parsed.identities.len(), 1);
    assert!(parsed.mnemonic.is_some());
}

#[test]
fn test_iidentity_data_full_roundtrip() {
    let identity = IIdentityData {
        identity_id: "rt_id".into(),
        username: "rt_user".into(),
        balance: "12345".into(),
        revision: 99,
        public_keys: vec![IIdentityPublicKey {
            id: 5,
            type_: "BLS12_381".into(),
            purpose: 3,
            security_level: 2,
            data: "deadbeef".into(),
            read_only: true,
            disabled_at: Some("2025-01-01".into()),
        }],
        identity_idx: Some(7),
        dpns_username: Some("rt_dpns".into()),
        is_authenticated: true,
        created_at: Some("2025-06-01".into()),
        public_key_ids: Some(vec![5]),
    };
    let json = serde_json::to_value(&identity).unwrap();
    let parsed: IIdentityData = serde_json::from_value(json).unwrap();
    assert_eq!(parsed, identity);
}

#[test]
fn test_cmd_res_macro_ok() {
    fn inner() -> Result<String, String> {
        Ok("hello".to_string())
    }
    let result: ICommandResult<String> = cmd_res!(inner());
    assert!(result.success);
    assert_eq!(result.data, Some("hello".to_string()));
    assert!(result.error.is_none());
}

#[test]
fn test_cmd_res_macro_err() {
    fn inner() -> Result<String, String> {
        Err("boom".to_string())
    }
    let result: ICommandResult<String> = cmd_res!(inner());
    assert!(!result.success);
    assert!(result.data.is_none());
    assert_eq!(result.error, Some("boom".to_string()));
}
