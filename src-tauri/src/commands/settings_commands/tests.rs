// src-tauri/src/commands/settings_commands/tests.rs

use super::*;
use crate::models::{INotificationSettings, IProfileSettings};
use crate::utils::{PersistentStore, StoreError};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Mutex;

struct MockStore {
    storage: Mutex<HashMap<String, Value>>,
}

impl PersistentStore for MockStore {
    fn load_value(&self, _path: &str, key: &str) -> Result<Option<Value>, StoreError> {
        let map = self.storage.lock().unwrap();
        Ok(map.get(key).cloned())
    }
    fn save_value(&self, _path: &str, key: &str, val: Value) -> Result<(), StoreError> {
        let mut map = self.storage.lock().unwrap();
        map.insert(key.to_string(), val);
        Ok(())
    }
    fn delete_value(&self, _path: &str, key: &str) -> Result<(), StoreError> {
        let mut map = self.storage.lock().unwrap();
        map.remove(key);
        Ok(())
    }
}

fn create_mock_settings() -> IAppSettings {
    IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: Some("test-id".to_string()),
    }
}

#[test]
fn test_settings_lifecycle_pure() {
    // No mock_builder()! This test is now CI safe.
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };
    let settings = create_mock_settings();

    // 1. Test Save
    save_settings_logic(&store, settings.clone()).expect("Failed to save");

    // 2. Test Load
    let load_res = load_settings_logic(&store).unwrap();
    assert!(load_res.is_some());
    assert_eq!(load_res.unwrap().theme, "dark");

    // 3. Test Delete
    let _ = delete_settings_logic(&store);

    // 4. Verify None
    let final_load = load_settings_logic(&store).unwrap();
    assert!(final_load.is_none());
}

#[test]
fn test_load_settings_empty_store() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let result = load_settings_logic(&store).unwrap();
    assert!(result.is_none());
}

#[test]
fn test_save_settings_with_all_fields() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let settings = IAppSettings {
        network: "mainnet".to_string(),
        theme: "light".to_string(),
        notifications: INotificationSettings {
            messages: true,
            mentions: false,
            contact_requests: true,
        },
        profile: IProfileSettings {
            display_name: "Test User".to_string(),
            username: "testuser".to_string(),
            bio: "Hello world".to_string(),
        },
        active_identity_id: Some("identity-123".to_string()),
    };

    save_settings_logic(&store, settings.clone()).unwrap();

    let loaded = load_settings_logic(&store).unwrap().unwrap();
    assert_eq!(loaded.network, "mainnet");
    assert_eq!(loaded.theme, "light");
    assert_eq!(loaded.notifications.messages, true);
    assert_eq!(loaded.notifications.mentions, false);
    assert_eq!(loaded.profile.display_name, "Test User");
    assert_eq!(loaded.active_identity_id, Some("identity-123".to_string()));
}

#[test]
fn test_save_settings_overwrites_existing() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let settings1 = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: None,
    };

    save_settings_logic(&store, settings1).unwrap();

    let settings2 = IAppSettings {
        network: "mainnet".to_string(),
        theme: "light".to_string(),
        notifications: INotificationSettings {
            messages: true,
            mentions: true,
            contact_requests: true,
        },
        profile: IProfileSettings {
            display_name: "Updated".to_string(),
            username: "updated".to_string(),
            bio: "Updated bio".to_string(),
        },
        active_identity_id: Some("new-id".to_string()),
    };

    save_settings_logic(&store, settings2).unwrap();

    let loaded = load_settings_logic(&store).unwrap().unwrap();
    assert_eq!(loaded.network, "mainnet");
    assert_eq!(loaded.theme, "light");
    assert_eq!(loaded.active_identity_id, Some("new-id".to_string()));
}

#[test]
fn test_delete_settings_returns_ok() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let result = delete_settings_logic(&store);
    assert!(result.is_ok());
}

#[test]
fn test_delete_settings_removes_data() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let settings = create_mock_settings();
    save_settings_logic(&store, settings).unwrap();

    assert!(load_settings_logic(&store).unwrap().is_some());

    delete_settings_logic(&store).unwrap();

    assert!(load_settings_logic(&store).unwrap().is_none());
}

#[test]
fn test_settings_with_no_active_identity() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "system".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: None,
    };

    save_settings_logic(&store, settings).unwrap();

    let loaded = load_settings_logic(&store).unwrap().unwrap();
    assert!(loaded.active_identity_id.is_none());
}

#[test]
fn test_settings_network_variants() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    // Test with testnet
    let testnet_settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: Some("testnet-id".to_string()),
    };
    save_settings_logic(&store, testnet_settings).unwrap();
    assert_eq!(
        load_settings_logic(&store).unwrap().unwrap().network,
        "testnet"
    );

    // Test with mainnet
    let mainnet_settings = IAppSettings {
        network: "mainnet".to_string(),
        theme: "light".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: Some("mainnet-id".to_string()),
    };
    save_settings_logic(&store, mainnet_settings).unwrap();
    assert_eq!(
        load_settings_logic(&store).unwrap().unwrap().network,
        "mainnet"
    );
}

#[test]
fn test_settings_theme_variants() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    for theme in &["dark", "light", "system"] {
        let settings = IAppSettings {
            network: "testnet".to_string(),
            theme: theme.to_string(),
            notifications: INotificationSettings::default(),
            profile: IProfileSettings::default(),
            active_identity_id: None,
        };
        save_settings_logic(&store, settings).unwrap();
        assert_eq!(load_settings_logic(&store).unwrap().unwrap().theme, *theme);
    }
}

#[test]
fn test_settings_notification_flags() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings {
            messages: true,
            mentions: true,
            contact_requests: false,
        },
        profile: IProfileSettings::default(),
        active_identity_id: None,
    };

    save_settings_logic(&store, settings).unwrap();

    let loaded = load_settings_logic(&store).unwrap().unwrap();
    assert!(loaded.notifications.messages);
    assert!(loaded.notifications.mentions);
    assert!(!loaded.notifications.contact_requests);
}

#[test]
fn test_settings_profile_data() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings {
            display_name: "John Doe".to_string(),
            username: "johndoe".to_string(),
            bio: "Software developer".to_string(),
        },
        active_identity_id: None,
    };

    save_settings_logic(&store, settings).unwrap();

    let loaded = load_settings_logic(&store).unwrap().unwrap();
    assert_eq!(loaded.profile.display_name, "John Doe");
    assert_eq!(loaded.profile.username, "johndoe");
    assert_eq!(loaded.profile.bio, "Software developer");
}

#[test]
fn test_settings_empty_profile() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings {
            display_name: "".to_string(),
            username: "".to_string(),
            bio: "".to_string(),
        },
        active_identity_id: None,
    };

    save_settings_logic(&store, settings).unwrap();

    let loaded = load_settings_logic(&store).unwrap().unwrap();
    assert_eq!(loaded.profile.display_name, "");
    assert_eq!(loaded.profile.username, "");
    assert_eq!(loaded.profile.bio, "");
}

#[test]
fn test_settings_long_identity_id() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let long_id = "a".repeat(100);
    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings::default(),
        active_identity_id: Some(long_id.clone()),
    };

    save_settings_logic(&store, settings).unwrap();

    let loaded = load_settings_logic(&store).unwrap().unwrap();
    assert_eq!(loaded.active_identity_id, Some(long_id));
}

#[test]
fn test_settings_special_chars_in_profile() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings {
            display_name: "Test \"Quoted\" Name".to_string(),
            username: "user_name-123".to_string(),
            bio: "Line1\nLine2\tTab".to_string(),
        },
        active_identity_id: None,
    };

    save_settings_logic(&store, settings).unwrap();

    let loaded = load_settings_logic(&store).unwrap().unwrap();
    assert_eq!(loaded.profile.display_name, "Test \"Quoted\" Name");
    assert_eq!(loaded.profile.bio, "Line1\nLine2\tTab");
}

#[test]
fn test_settings_unicode_in_profile() {
    let store = MockStore {
        storage: Mutex::new(HashMap::new()),
    };

    let settings = IAppSettings {
        network: "testnet".to_string(),
        theme: "dark".to_string(),
        notifications: INotificationSettings::default(),
        profile: IProfileSettings {
            display_name: "日本語ユーザー".to_string(),
            username: "user_emoji_🚀".to_string(),
            bio: "Ñoño café ☕".to_string(),
        },
        active_identity_id: None,
    };

    save_settings_logic(&store, settings).unwrap();

    let loaded = load_settings_logic(&store).unwrap().unwrap();
    assert_eq!(loaded.profile.display_name, "日本語ユーザー");
    assert_eq!(loaded.profile.username, "user_emoji_🚀");
}
