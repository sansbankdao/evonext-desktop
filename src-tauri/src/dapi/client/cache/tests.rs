// src-tauri/src/dapi/client/cache/tests.rs

use super::*;
use serde_json::json;
use std::thread;

#[test]
fn test_cache_set_and_get() {
    let mut cache = Cache::new(10);
    let key = "test_key".to_string();
    let value = json!({"data": "test_value"});

    cache.set(key.clone(), value.clone());

    let result = cache.get(&key);
    assert!(result.is_some());
    assert_eq!(result.unwrap(), value);
}

#[test]
fn test_cache_expiration() {
    let mut cache = Cache::with_ttl(10, Duration::from_millis(100));
    let key = "expire_key".to_string();
    let value = json!(123);

    cache.set(key.clone(), value);
    assert!(cache.get(&key).is_some());

    thread::sleep(Duration::from_millis(150));
    assert!(cache.get(&key).is_none());
}

#[test]
fn test_cache_capacity_eviction() {
    let mut cache = Cache::new(2);
    cache.set("k1".into(), json!(1));
    cache.set("k2".into(), json!(2));
    cache.set("k3".into(), json!(3));

    assert_eq!(cache.size(), 2);
    assert!(cache.get("k1").is_none());
}
