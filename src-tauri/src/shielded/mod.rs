// src-tauri/src/shielded/mod.rs

//! Shielded (Orchard / Halo2) spike — Week 3-4 per
//! docs/HANDOFF-DCG-SDK-AND-SHIELDED.md §4.
//!
//! Desktop consumes the pure-Rust `platform-wallet` crate NATIVELY
//! (no FFI / JNI, unlike mobile). This module currently carries only the
//! spike validation tests: prove the pinned crate compiles and its
//! shielded key-derivation surface behaves deterministically.

#[cfg(test)]
mod tests {
    use dashcore::Network;
    use platform_wallet::wallet::shielded::keys::OrchardKeySet;

    /// ZIP-32 seed lengths are 32..=252 bytes — a fixed 64-byte test seed.
    const TEST_SEED: [u8; 64] = [0x42u8; 64];

    #[test]
    fn test_orchard_keyset_from_seed_is_deterministic() {
        let a = OrchardKeySet::from_seed(&TEST_SEED, Network::Testnet, 0)
            .expect("valid seed must derive");
        let b = OrchardKeySet::from_seed(&TEST_SEED, Network::Testnet, 0)
            .expect("valid seed must derive");

        assert!(a.default_address == b.default_address);
    }

    #[test]
    fn test_orchard_addresses_differ_by_index() {
        let keys = OrchardKeySet::from_seed(&TEST_SEED, Network::Testnet, 0)
            .expect("valid seed must derive");

        let addr0 = keys.address_at(0);
        let addr1 = keys.address_at(1);

        assert!(addr0 != addr1);
    }

    #[test]
    fn test_orchard_keyset_rejects_short_seed() {
        let short = [0x42u8; 16];
        let result = OrchardKeySet::from_seed(&short, Network::Testnet, 0);

        assert!(result.is_err());
    }
}
