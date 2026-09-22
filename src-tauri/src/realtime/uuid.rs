// src-tauri/src/realtime/uuid.rs
//
//! Minimal RFC-4122 v4 UUID generation.
//!
//! Deliberately NOT always-on-gated: the device identity needs a UUID even in
//! builds where the `realtime` socket feature is disabled, so that a desktop
//! client can still register itself for notifications.
//!
//! A hand-rolled formatter is used rather than the `uuid` crate to avoid
//! pulling a dependency in for what is a dozen lines. `rand` is already a
//! direct dependency.

/// Produce a UUID-v4-shaped random string from the OS RNG.
pub fn uuid_like() -> String {
    let mut bytes = [0u8; 16];
    rand::RngCore::fill_bytes(&mut rand::rng(), &mut bytes);

    // RFC 4122 v4 markers.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    format!(
        "{:02x}{:02x}{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}-{:02x}{:02x}{:02x}{:02x}{:02x}{:02x}",
        bytes[0], bytes[1], bytes[2], bytes[3],
        bytes[4], bytes[5],
        bytes[6], bytes[7],
        bytes[8], bytes[9],
        bytes[10], bytes[11], bytes[12], bytes[13], bytes[14], bytes[15],
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn has_uuid_v4_shape() {
        let id = uuid_like();
        assert_eq!(id.len(), 36);

        let parts: Vec<&str> = id.split('-').collect();
        assert_eq!(
            parts.iter().map(|p| p.len()).collect::<Vec<_>>(),
            vec![8, 4, 4, 4, 12]
        );
        assert!(parts[2].starts_with('4'));
        assert!(matches!(
            parts[3].chars().next().unwrap(),
            '8' | '9' | 'a' | 'b'
        ));
    }

    #[test]
    fn is_unique() {
        // Guards against a broken RNG returning a constant.
        let ids: std::collections::HashSet<String> = (0..64).map(|_| uuid_like()).collect();
        assert_eq!(ids.len(), 64);
    }
}
