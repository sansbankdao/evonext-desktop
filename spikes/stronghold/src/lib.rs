// spikes/stronghold/src/lib.rs
//
// Spike support code: the custom `DashEcdsaPrehashSign` procedure.
//
// Stronghold's built-in `Secp256k1EcdsaSign` only offers Keccak256/Sha256
// flavors — both HASH the message internally. Dash signs pre-computed
// 32-byte digests (sighash = double-SHA256 of the tx preimage), so the
// built-in procedure cannot produce valid Dash signatures. The underlying
// iota-crypto secp256k1 SecretKey DOES expose `try_sign_prehash([u8;32])`;
// this procedure bridges the gap via Stronghold's documented custom-
// procedure extension point. The secret key never leaves guarded memory:
// `use_secret` receives the vault's Buffer guards, the key is parsed
// in-place, signed, and the guards drop.

use iota_stronghold::{
    engine::runtime::memories::buffer::Buffer,
    procedures::{FatalProcedureError, Procedure, ProcedureError, Runner, UseSecret},
    Location,
};

/// Sign a pre-computed 32-byte digest (Dash sighash) with a secp256k1 key
/// stored in the vault. Output: 65-byte recoverable signature (r||s||v),
/// matching iota-crypto's RecoverableSignature encoding.
#[derive(Debug, Clone)]
pub struct DashEcdsaPrehashSign {
    pub digest: [u8; 32],
    pub private_key: Location,
}

impl UseSecret<1> for DashEcdsaPrehashSign {
    type Output = Vec<u8>;

    fn use_secret(self, guards: [Buffer<u8>; 1]) -> Result<Self::Output, FatalProcedureError> {
        // iota-crypto's [lib] name is "crypto" (not "iota_crypto").
        use crypto::signatures::secp256k1_ecdsa::SecretKey;

        let guard = guards[0].borrow();
        let bytes: &[u8] = guard.as_ref();
        let raw: [u8; 32] = bytes[..32]
            .try_into()
            .map_err(|_| {
                FatalProcedureError::from("secp256k1 secret must be >= 32 bytes".to_string())
            })?;
        let sk = SecretKey::try_from_bytes(&raw)
            .map_err(|e| FatalProcedureError::from(format!("invalid secp256k1 secret: {e}")))?;
        let sig = sk
            .try_sign_prehash(&self.digest)
            .map_err(|e| FatalProcedureError::from(format!("prehash sign failed: {e}")))?;
        Ok(sig.to_bytes().to_vec())
    }

    fn source(&self) -> [Location; 1] {
        [self.private_key.clone()]
    }
}

impl Procedure for DashEcdsaPrehashSign {
    type Output = Vec<u8>;

    fn execute<R: Runner>(self, runner: &R) -> Result<Self::Output, ProcedureError> {
        self.exec(runner)
    }
}

#[cfg(test)]
mod spike_tests;
