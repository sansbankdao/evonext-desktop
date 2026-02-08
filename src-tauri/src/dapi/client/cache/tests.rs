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
    // Create cache with 100ms TTL
    let mut cache = Cache::with_ttl(10, Duration::from_millis(100));
    let key = "expire_key".to_string();
    let value = json!(123);

    cache.set(key.clone(), value);

    // Immediate get should work
    assert!(cache.get(&key).is_some());

    // Wait for expiration
    thread::sleep(Duration::from_millis(150));

    // Should be None now
    assert!(cache.get(&key).is_none());
}

#[test]
fn test_cache_capacity_eviction() {
    let mut cache = Cache::new(2); // Small capacity

    cache.set("k1".into(), json!(1));
    cache.set("k2".into(), json!(2));

    // Adding a 3rd should evict the first
    cache.set("k3".into(), json!(3));

    assert_eq!(cache.size(), 2);
    // k1 should be gone (first-in-first-out logic in current implementation)
    assert!(cache.get("k1").is_none());
    assert!(cache.get("k2").is_some());
    assert!(cache.get("k3").is_some());
}

#[test]
fn test_cache_cleanup() {
    let mut cache = Cache::with_ttl(10, Duration::from_millis(10));
    cache.set("k1".into(), json!(1));

    thread::sleep(Duration::from_millis(20));

    // Even if we don't 'get', cleanup should remove it
    cache.cleanup();
    assert_eq!(cache.size(), 0);
}

#[test]
fn test_cache_clear() {
    let mut cache = Cache::new(10);
    cache.set("k1".into(), json!(1));
    cache.clear();
    assert_eq!(cache.size(), 0);
}
