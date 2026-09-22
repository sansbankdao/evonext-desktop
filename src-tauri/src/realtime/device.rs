// src-tauri/src/realtime/device.rs
//
//! Stable per-installation device identity for the realtime hub.
//!
//! WHY THIS EXISTS
//! ---------------
//! The manager fan-out discovers recipients by querying `push_devices`. That
//! table declares `deviceToken TEXT NOT NULL UNIQUE`, so a desktop client with
//! no push token had no way to appear in it and could never be discovered.
//!
//! A desktop client therefore registers a random UUID as its `deviceToken`.
//! It carries no push meaning; it exists purely to satisfy that column and to
//! give the client a stable identifier the server can key on. `platform` is
//! `z.string()` on the API side (not an enum), so `desktop` is accepted with no
//! schema change.
//!
//! WHY IT IS PERSISTED
//! -------------------
//! The UUID must survive restarts. If a new one were minted per launch, every
//! launch would insert another `push_devices` row and the table would grow
//! without bound while the fan-out emitted duplicate notifications to the same
//! machine.

use serde::{Deserialize, Serialize};

use super::uuid::uuid_like;

/// Platform label sent to the push registry.
///
/// Distinguishes a desktop registration from a mobile one so the two can be
/// separated later without a schema change.
pub const PLATFORM_DESKTOP: &str = "desktop";

/// Storage file (relative to the Tauri app-data directory).
pub const DEVICE_STORE_PATH: &str = "realtime.json";

/// Storage key holding the persisted device token.
pub const DEVICE_TOKEN_KEY: &str = "deviceToken";

/// Persisted device identity.
///
/// Only the token is stored. `platform` is a constant and is deliberately not
/// persisted, so there is exactly one source of truth for it.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeviceIdentity {
    pub device_token: String,
}

impl DeviceIdentity {
    /// Wrap an existing token.
    pub fn from_token(token: impl Into<String>) -> Self {
        Self {
            device_token: token.into(),
        }
    }

    /// Reject a stored value that is not usable as a device token.
    ///
    /// Guards against a corrupted or hand-edited `realtime.json` producing an
    /// empty token, which the API would accept while making every desktop
    /// installation collide on the same `deviceToken` value.
    pub fn is_valid(&self) -> bool {
        !self.device_token.trim().is_empty()
    }
}

/// Mint a fresh, RFC-4122-v4-shaped device token.
pub fn new_device_token() -> String {
    uuid_like()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_an_rfc4122_v4_shaped_token() {
        let token = new_device_token();

        // 8-4-4-4-12, lowercase hex.
        let parts: Vec<&str> = token.split('-').collect();
        assert_eq!(parts.len(), 5);
        assert_eq!(parts[0].len(), 8);
        assert_eq!(parts[1].len(), 4);
        assert_eq!(parts[2].len(), 4);
        assert_eq!(parts[3].len(), 4);
        assert_eq!(parts[4].len(), 12);

        assert!(token.chars().all(|c| c.is_ascii_hexdigit() || c == '-'));

        // Version 4 marker.
        assert!(parts[2].starts_with('4'));

        // Variant marker (8, 9, a, or b).
        let variant = parts[3].chars().next().unwrap();
        assert!(matches!(variant, '8' | '9' | 'a' | 'b'));
    }

    #[test]
    fn tokens_are_unique_across_calls() {
        // A repeated token would mean every desktop install overwrote the
        // previous one's registration row.
        let a = new_device_token();
        let b = new_device_token();
        assert_ne!(a, b);
    }

    #[test]
    fn token_fits_the_api_column() {
        // `deviceToken TEXT NOT NULL UNIQUE` — a UUID is 36 chars. This pins
        // that the generator cannot drift into something absurd.
        let token = new_device_token();
        assert_eq!(token.len(), 36);
    }

    #[test]
    fn valid_identity_accepts_a_generated_token() {
        let identity = DeviceIdentity::from_token(new_device_token());
        assert!(identity.is_valid());
    }

    #[test]
    fn valid_identity_rejects_empty_and_whitespace_tokens() {
        assert!(!DeviceIdentity::from_token("").is_valid());
        assert!(!DeviceIdentity::from_token("   ").is_valid());
    }

    #[test]
    fn round_trips_through_json() {
        let identity = DeviceIdentity::from_token(new_device_token());
        let encoded = serde_json::to_string(&identity).unwrap();
        let decoded: DeviceIdentity = serde_json::from_str(&encoded).unwrap();
        assert_eq!(identity, decoded);
    }

    #[test]
    fn json_field_name_is_stable() {
        // The persisted key is part of the on-disk format. Renaming it would
        // silently orphan every existing install's token on upgrade.
        let identity = DeviceIdentity::from_token("abc");
        let encoded = serde_json::to_string(&identity).unwrap();
        assert!(encoded.contains("device_token"));
    }

    #[test]
    fn platform_is_not_mobile() {
        assert_eq!(PLATFORM_DESKTOP, "desktop");
    }
}
