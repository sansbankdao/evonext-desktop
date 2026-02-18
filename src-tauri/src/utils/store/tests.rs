// src-tauri/src/utils/store/tests.rs

use super::*;
use serde::{Deserialize, Serialize};

// ==================== StoreError Tests ====================

#[test]
fn test_store_error_io_display() {
    let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file not found");
    let store_err = StoreError::Io(io_err);
    let display = format!("{}", store_err);
    assert!(display.contains("IO error"));
    assert!(display.contains("file not found"));
}

#[test]
fn test_store_error_json_display() {
    let json_err = serde_json::from_str::<i32>("not a number").unwrap_err();
    let store_err = StoreError::Json(json_err);
    let display = format!("{}", store_err);
    assert!(display.contains("JSON error"));
}

#[test]
fn test_store_error_store_display() {
    let store_err = StoreError::Store("custom store error".to_string());
    let display = format!("{}", store_err);
    assert!(display.contains("Store error"));
    assert!(display.contains("custom store error"));
}

#[test]
fn test_store_error_invalid_path_display() {
    let store_err = StoreError::InvalidPath("path is invalid".to_string());
    let display = format!("{}", store_err);
    assert!(display.contains("Invalid path"));
    assert!(display.contains("path is invalid"));
}

#[test]
fn test_store_error_from_io_error() {
    let io_err = std::io::Error::new(std::io::ErrorKind::PermissionDenied, "permission denied");
    let store_err: StoreError = io_err.into();
    match store_err {
        StoreError::Io(_) => (),
        _ => panic!("Expected Io variant"),
    }
}

#[test]
fn test_store_error_from_json_error() {
    let json_err = serde_json::from_str::<bool>("not a bool").unwrap_err();
    let store_err: StoreError = json_err.into();
    match store_err {
        StoreError::Json(_) => (),
        _ => panic!("Expected Json variant"),
    }
}

#[test]
fn test_store_error_debug() {
    let store_err = StoreError::InvalidPath("test".to_string());
    let debug = format!("{:?}", store_err);
    assert!(debug.contains("InvalidPath"));
}

// ==================== Test Data Structures ====================

#[derive(Debug, Serialize, Deserialize, PartialEq)]
struct TestUser {
    name: String,
    age: u32,
    active: bool,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
struct TestSettings {
    theme: String,
    notifications_enabled: bool,
    volume: f64,
}

#[derive(Debug, Serialize, Deserialize, PartialEq)]
struct NestedData {
    id: String,
    metadata: Vec<String>,
    config: TestSettings,
}

// ==================== Serialization Tests ====================

#[test]
fn test_serialize_test_user() {
    let user = TestUser {
        name: "Alice".to_string(),
        age: 30,
        active: true,
    };
    let json = serde_json::to_value(&user).unwrap();
    assert_eq!(json["name"], "Alice");
    assert_eq!(json["age"], 30);
    assert_eq!(json["active"], true);
}

#[test]
fn test_serialize_test_settings() {
    let settings = TestSettings {
        theme: "dark".to_string(),
        notifications_enabled: false,
        volume: 0.75,
    };
    let json = serde_json::to_value(&settings).unwrap();
    assert_eq!(json["theme"], "dark");
    assert_eq!(json["notifications_enabled"], false);
    assert_eq!(json["volume"], 0.75);
}

#[test]
fn test_serialize_nested_data() {
    let nested = NestedData {
        id: "nested_123".to_string(),
        metadata: vec!["tag1".to_string(), "tag2".to_string()],
        config: TestSettings {
            theme: "light".to_string(),
            notifications_enabled: true,
            volume: 1.0,
        },
    };
    let json = serde_json::to_value(&nested).unwrap();
    assert_eq!(json["id"], "nested_123");
    assert!(json["metadata"].is_array());
    assert_eq!(json["config"]["theme"], "light");
}

#[test]
fn test_deserialize_test_user() {
    let json = serde_json::json!({
        "name": "Bob",
        "age": 25,
        "active": false
    });
    let user: TestUser = serde_json::from_value(json).unwrap();
    assert_eq!(user.name, "Bob");
    assert_eq!(user.age, 25);
    assert_eq!(user.active, false);
}

#[test]
fn test_deserialize_test_settings() {
    let json = serde_json::json!({
        "theme": "system",
        "notifications_enabled": true,
        "volume": 0.5
    });
    let settings: TestSettings = serde_json::from_value(json).unwrap();
    assert_eq!(settings.theme, "system");
    assert_eq!(settings.notifications_enabled, true);
    assert_eq!(settings.volume, 0.5);
}

#[test]
fn test_deserialize_nested_data() {
    let json = serde_json::json!({
        "id": "test_id",
        "metadata": ["a", "b", "c"],
        "config": {
            "theme": "dark",
            "notifications_enabled": false,
            "volume": 0.8
        }
    });
    let nested: NestedData = serde_json::from_value(json).unwrap();
    assert_eq!(nested.id, "test_id");
    assert_eq!(nested.metadata.len(), 3);
    assert_eq!(nested.config.theme, "dark");
}

// ==================== Value Type Tests ====================

#[test]
fn test_serialize_string_value() {
    let val = serde_json::json!("test string");
    assert!(val.is_string());
    assert_eq!(val.as_str().unwrap(), "test string");
}

#[test]
fn test_serialize_number_value() {
    let val = serde_json::json!(42);
    assert!(val.is_number());
    assert_eq!(val.as_u64().unwrap(), 42);
}

#[test]
fn test_serialize_bool_value() {
    let val_true = serde_json::json!(true);
    let val_false = serde_json::json!(false);
    assert!(val_true.is_boolean());
    assert!(val_false.is_boolean());
    assert_eq!(val_true.as_bool().unwrap(), true);
    assert_eq!(val_false.as_bool().unwrap(), false);
}

#[test]
fn test_serialize_array_value() {
    let val = serde_json::json!([1, 2, 3, "four", true]);
    assert!(val.is_array());
    let arr = val.as_array().unwrap();
    assert_eq!(arr.len(), 5);
}

#[test]
fn test_serialize_object_value() {
    let val = serde_json::json!({
        "key1": "value1",
        "key2": 123,
        "key3": null
    });
    assert!(val.is_object());
    let obj = val.as_object().unwrap();
    assert_eq!(obj.len(), 3);
    assert!(obj.contains_key("key1"));
    assert!(obj.contains_key("key2"));
    assert!(obj.contains_key("key3"));
}

#[test]
fn test_serialize_null_value() {
    let val = serde_json::json!(null);
    assert!(val.is_null());
}

// ==================== Edge Case Tests ====================

#[test]
fn test_serialize_empty_string() {
    let val = serde_json::json!("");
    assert!(val.is_string());
    assert_eq!(val.as_str().unwrap(), "");
}

#[test]
fn test_serialize_empty_array() {
    let val = serde_json::json!([]);
    assert!(val.is_array());
    assert_eq!(val.as_array().unwrap().len(), 0);
}

#[test]
fn test_serialize_empty_object() {
    let val = serde_json::json!({});
    assert!(val.is_object());
    assert_eq!(val.as_object().unwrap().len(), 0);
}

#[test]
fn test_serialize_large_number() {
    let val = serde_json::json!(u64::MAX);
    assert!(val.is_number());
    assert_eq!(val.as_u64().unwrap(), u64::MAX);
}

#[test]
fn test_serialize_negative_number() {
    let val = serde_json::json!(-42);
    assert!(val.is_number());
    assert_eq!(val.as_i64().unwrap(), -42);
}

#[test]
fn test_serialize_float() {
    let val = serde_json::json!(3.14159);
    assert!(val.is_number());
    assert!((val.as_f64().unwrap() - 3.14159).abs() < 0.0001);
}

#[test]
fn test_serialize_special_characters() {
    let special = "Hello\nWorld\t\"Quotes\"\n\\Backslash\\";
    let val = serde_json::json!(special);
    let serialized = serde_json::to_string(&val).unwrap();
    let deserialized: String = serde_json::from_str(&serialized).unwrap();
    assert_eq!(deserialized, special);
}

#[test]
fn test_serialize_unicode() {
    let unicode = "日本語 🚀 Ñoño";
    let val = serde_json::json!(unicode);
    let serialized = serde_json::to_string(&val).unwrap();
    let deserialized: String = serde_json::from_str(&serialized).unwrap();
    assert_eq!(deserialized, unicode);
}

// ==================== Trait Implementation Tests ====================

#[test]
fn test_store_error_is_std_error() {
    fn takes_error<E: std::error::Error>(_err: E) {}
    let err = StoreError::InvalidPath("test".to_string());
    takes_error(err);
}

#[test]
fn test_store_error_chain() {
    let io_err = std::io::Error::new(std::io::ErrorKind::Other, "inner error");
    let store_err: StoreError = io_err.into();

    // Verify we can get the display chain
    let display = format!("{}", store_err);
    assert!(!display.is_empty());
}

// ==================== Complex Data Structure Tests ====================

#[derive(Debug, Serialize, Deserialize, PartialEq)]
struct OptionalFields {
    required: String,
    optional_string: Option<String>,
    optional_number: Option<u32>,
    optional_nested: Option<TestSettings>,
}

#[test]
fn test_serialize_optional_fields_all_present() {
    let data = OptionalFields {
        required: "required".to_string(),
        optional_string: Some("optional".to_string()),
        optional_number: Some(42),
        optional_nested: Some(TestSettings {
            theme: "dark".to_string(),
            notifications_enabled: true,
            volume: 0.5,
        }),
    };
    let json = serde_json::to_value(&data).unwrap();
    assert!(json.get("optional_string").unwrap().is_string());
    assert!(json.get("optional_number").unwrap().is_u64());
}

#[test]
fn test_serialize_optional_fields_all_none() {
    let data = OptionalFields {
        required: "required".to_string(),
        optional_string: None,
        optional_number: None,
        optional_nested: None,
    };
    let json = serde_json::to_value(&data).unwrap();
    // Default behavior is to include null for None values
    assert!(json.get("optional_string").unwrap().is_null());
    assert!(json.get("optional_number").unwrap().is_null());
}

#[test]
fn test_deserialize_optional_fields_with_nulls() {
    let json = serde_json::json!({
        "required": "test",
        "optional_string": null,
        "optional_number": null,
        "optional_nested": null
    });
    let data: OptionalFields = serde_json::from_value(json).unwrap();
    assert_eq!(data.required, "test");
    assert!(data.optional_string.is_none());
    assert!(data.optional_number.is_none());
}

#[test]
fn test_deserialize_optional_fields_all_present() {
    let json = serde_json::json!({
        "required": "test",
        "optional_string": "present",
        "optional_number": 123,
        "optional_nested": {
            "theme": "light",
            "notifications_enabled": false,
            "volume": 0.25
        }
    });
    let data: OptionalFields = serde_json::from_value(json).unwrap();
    assert_eq!(data.required, "test");
    assert_eq!(data.optional_string, Some("present".to_string()));
    assert_eq!(data.optional_number, Some(123));
    assert!(data.optional_nested.is_some());
}

// ==================== Deeply Nested Structure Tests ====================

#[derive(Debug, Serialize, Deserialize)]
struct Level3 {
    value: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Level2 {
    level3: Level3,
    items: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Level1 {
    level2: Level2,
    count: u32,
}

#[test]
fn test_serialize_deeply_nested() {
    let data = Level1 {
        level2: Level2 {
            level3: Level3 {
                value: "deep_value".to_string(),
            },
            items: vec!["a".to_string(), "b".to_string()],
        },
        count: 5,
    };
    let json = serde_json::to_value(&data).unwrap();
    assert_eq!(json["level2"]["level3"]["value"], "deep_value");
    assert_eq!(json["level2"]["items"].as_array().unwrap().len(), 2);
    assert_eq!(json["count"], 5);
}

#[test]
fn test_deserialize_deeply_nested() {
    let json = serde_json::json!({
        "level2": {
            "level3": {
                "value": "nested_value"
            },
            "items": ["x", "y", "z"]
        },
        "count": 10
    });
    let data: Level1 = serde_json::from_value(json).unwrap();
    assert_eq!(data.level2.level3.value, "nested_value");
    assert_eq!(data.level2.items.len(), 3);
    assert_eq!(data.count, 10);
}

// ==================== Large Data Tests ====================

#[test]
fn test_serialize_large_array() {
    let large_array: Vec<u32> = (0..10000).collect();
    let json = serde_json::to_value(&large_array).unwrap();
    let arr = json.as_array().unwrap();
    assert_eq!(arr.len(), 10000);
}

#[test]
fn test_serialize_large_object() {
    let mut large_obj = serde_json::Map::new();
    for i in 0..1000 {
        large_obj.insert(format!("key_{}", i), serde_json::json!(i));
    }
    let json = serde_json::Value::Object(large_obj);
    assert_eq!(json.as_object().unwrap().len(), 1000);
}

#[test]
fn test_serialize_very_long_string() {
    let long_string = "x".repeat(100000);
    let json = serde_json::json!(long_string);
    assert_eq!(json.as_str().unwrap().len(), 100000);
}
