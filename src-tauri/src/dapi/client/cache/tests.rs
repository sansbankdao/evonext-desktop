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

// =====================================================
// NEW TESTS: cover remaining Cache methods
// =====================================================

#[test]
fn test_cache_remove() {
    let mut cache = Cache::new(10);
    cache.set("rm_key".into(), json!("to_remove"));
    assert!(cache.get("rm_key").is_some());

    let removed = cache.remove("rm_key");
    assert!(removed.is_some());
    assert_eq!(removed.unwrap(), json!("to_remove"));
    assert!(cache.get("rm_key").is_none());
    assert_eq!(cache.size(), 0);
}

#[test]
fn test_cache_remove_nonexistent() {
    let mut cache = Cache::new(10);
    let removed = cache.remove("ghost_key");
    assert!(removed.is_none());
}

#[test]
fn test_cache_clear() {
    let mut cache = Cache::new(10);
    cache.set("a".into(), json!(1));
    cache.set("b".into(), json!(2));
    cache.set("c".into(), json!(3));
    assert_eq!(cache.size(), 3);

    cache.clear();
    assert_eq!(cache.size(), 0);
    assert!(cache.get("a").is_none());
    assert!(cache.get("b").is_none());
    assert!(cache.get("c").is_none());
}

#[test]
fn test_cache_size() {
    let mut cache = Cache::new(10);
    assert_eq!(cache.size(), 0);

    cache.set("x".into(), json!("val"));
    assert_eq!(cache.size(), 1);

    cache.set("y".into(), json!("val2"));
    assert_eq!(cache.size(), 2);
}

#[test]
fn test_cache_get_ttl_valid() {
    let mut cache = Cache::with_ttl(10, Duration::from_secs(60));
    cache.set("ttl_key".into(), json!("data"));

    let ttl = cache.get_ttl("ttl_key");
    assert!(ttl.is_some());
    // Should be close to 60 seconds (allow some slack)
    assert!(ttl.unwrap().as_secs() > 50);
}

#[test]
fn test_cache_get_ttl_missing_key() {
    let cache = Cache::new(10);
    let ttl = cache.get_ttl("no_such_key");
    assert!(ttl.is_none());
}

#[test]
fn test_cache_get_ttl_expired() {
    let mut cache = Cache::with_ttl(10, Duration::from_millis(50));
    cache.set("exp_ttl".into(), json!("data"));

    thread::sleep(Duration::from_millis(80));

    let ttl = cache.get_ttl("exp_ttl");
    assert!(ttl.is_some());
    assert_eq!(ttl.unwrap().as_secs(), 0);
}

#[test]
fn test_cache_set_default_ttl() {
    let mut cache = Cache::new(10);
    cache.set_default_ttl(Duration::from_secs(10));

    cache.set("short_ttl".into(), json!("data"));

    let ttl = cache.get_ttl("short_ttl");
    assert!(ttl.is_some());
    assert!(ttl.unwrap().as_secs() <= 10);
}

#[test]
fn test_cache_set_with_ttl() {
    let mut cache = Cache::new(10);
    cache.set_with_ttl("custom".into(), json!("val"), Duration::from_secs(120));

    let ttl = cache.get_ttl("custom");
    assert!(ttl.is_some());
    assert!(ttl.unwrap().as_secs() > 100);
}

#[test]
fn test_cache_update_existing_key() {
    let mut cache = Cache::new(10);
    cache.set("upd".into(), json!("original"));
    assert_eq!(cache.get("upd").unwrap(), json!("original"));

    cache.set("upd".into(), json!("updated"));
    assert_eq!(cache.get("upd").unwrap(), json!("updated"));
    assert_eq!(cache.size(), 1);
}

#[test]
fn test_cache_cleanup_expired() {
    let mut cache = Cache::with_ttl(10, Duration::from_millis(50));
    cache.set("exp1".into(), json!(1));
    cache.set("exp2".into(), json!(2));

    // Add a non-expiring one
    cache.set_with_ttl("keep".into(), json!(3), Duration::from_secs(60));

    thread::sleep(Duration::from_millis(80));

    cache.cleanup();

    assert_eq!(cache.size(), 1);
    assert!(cache.get("keep").is_some());
    assert!(cache.get("exp1").is_none());
    assert!(cache.get("exp2").is_none());
}

#[test]
fn test_cache_entry_is_expired() {
    let entry = CacheEntry::new(json!("test"), Duration::from_millis(50));
    assert!(!entry.is_expired());

    thread::sleep(Duration::from_millis(80));
    assert!(entry.is_expired());
}

#[test]
fn test_cache_entry_not_expired() {
    let entry = CacheEntry::new(json!("test"), Duration::from_secs(60));
    assert!(!entry.is_expired());
}

#[test]
fn test_cache_fifo_eviction_order() {
    let mut cache = Cache::new(3);
    cache.set("first".into(), json!(1));
    cache.set("second".into(), json!(2));
    cache.set("third".into(), json!(3));

    // Adding a 4th should evict "first" (FIFO)
    cache.set("fourth".into(), json!(4));
    assert!(cache.get("first").is_none());
    assert!(cache.get("second").is_some());
    assert!(cache.get("third").is_some());
    assert!(cache.get("fourth").is_some());
    assert_eq!(cache.size(), 3);
}

#[test]
fn test_cache_update_moves_to_back_of_order() {
    let mut cache = Cache::new(3);
    cache.set("a".into(), json!(1));
    cache.set("b".into(), json!(2));
    cache.set("c".into(), json!(3));

    // Update "a" — should move it to the back
    cache.set("a".into(), json!(10));

    // Now adding "d" should evict "b" (the oldest after "a" was moved)
    cache.set("d".into(), json!(4));
    assert!(cache.get("b").is_none());
    assert!(cache.get("a").is_some());
    assert!(cache.get("c").is_some());
    assert!(cache.get("d").is_some());
}
