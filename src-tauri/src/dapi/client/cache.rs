// src-tauri/src/dapi/client/cache.rs

use serde_json::Value;
use std::collections::{HashMap, VecDeque};
use std::time::{Duration, Instant};

#[cfg(test)]
mod tests;

#[derive(Debug)]
pub struct CacheEntry {
    pub value: Value,
    pub expires_at: Instant,
}

impl CacheEntry {
    pub fn new(value: Value, ttl: Duration) -> Self {
        Self {
            value,
            expires_at: Instant::now() + ttl,
        }
    }
    pub fn is_expired(&self) -> bool {
        Instant::now() > self.expires_at
    }
}

#[derive(Debug)]
pub struct Cache {
    entries: HashMap<String, CacheEntry>,
    order: VecDeque<String>, // Tracks insertion order for deterministic eviction
    capacity: usize,
    default_ttl: Duration,
}

#[allow(dead_code)]
impl Cache {
    pub fn new(capacity: usize) -> Self {
        Self {
            entries: HashMap::with_capacity(capacity),
            order: VecDeque::with_capacity(capacity),
            capacity,
            default_ttl: Duration::from_secs(300),
        }
    }
    pub fn with_ttl(capacity: usize, default_ttl: Duration) -> Self {
        Self {
            entries: HashMap::with_capacity(capacity),
            order: VecDeque::with_capacity(capacity),
            capacity,
            default_ttl,
        }
    }
    pub fn get(&self, key: &str) -> Option<Value> {
        self.entries.get(key).and_then(|entry| {
            if entry.is_expired() {
                None
            } else {
                Some(entry.value.clone())
            }
        })
    }
    pub fn set(&mut self, key: String, value: Value) {
        self.set_with_ttl(key, value, self.default_ttl);
    }
    pub fn set_with_ttl(&mut self, key: String, value: Value, ttl: Duration) {
        self.cleanup();
        // If key exists, update it and move to back of order
        if self.entries.contains_key(&key) {
            self.order.retain(|k| k != &key);
        } else if self.entries.len() >= self.capacity {
            // FIFO Eviction: Remove the oldest key
            if let Some(oldest_key) = self.order.pop_front() {
                self.entries.remove(&oldest_key);
            }
        }
        self.order.push_back(key.clone());
        let entry = CacheEntry::new(value, ttl);
        self.entries.insert(key, entry);
    }
    pub fn remove(&mut self, key: &str) -> Option<Value> {
        self.order.retain(|k| k != key);
        self.entries.remove(key).map(|entry| entry.value)
    }
    pub fn clear(&mut self) {
        self.entries.clear();
        self.order.clear();
    }
    pub fn size(&self) -> usize {
        self.entries.len()
    }
    pub fn cleanup(&mut self) {
        let expired_keys: Vec<String> = self
            .entries
            .iter()
            .filter(|(_, entry)| entry.is_expired())
            .map(|(key, _)| key.clone())
            .collect();
        for key in expired_keys {
            self.remove(&key);
        }
    }
    pub fn get_ttl(&self, key: &str) -> Option<Duration> {
        self.entries.get(key).map(|entry| {
            let now = Instant::now();
            if entry.expires_at > now {
                entry.expires_at - now
            } else {
                Duration::from_secs(0)
            }
        })
    }
    pub fn set_default_ttl(&mut self, ttl: Duration) {
        self.default_ttl = ttl;
    }
}
