// src-tauri/src/crypto/signed_message.rs
//
//! Dash Signed Message — hash + sign + verify, in Rust.
//!
//! Wire-compatible with the two reference implementations already in
//! production:
//!
//!   * Mobile signer    — evonext-mobile (Dash Signed Message over @evonext/crypto)
//!   * Server verifier  — evonext-api/src/libs/verifySignature.ts (`hashMessage`)
//!
//! The canonical byte sequence is:
//!
//!     0x19                                    // 25, per the Dash spec
//!     "Dash Signed Message:\n"                // 21 bytes
//!     msgbuf.length                           // SINGLE byte
//!     msgbuf                                  // UTF-8 message bytes
//!
//! then double-SHA256. Note the prefix byte is 0x19 (25) even though the
//! magic string is only 21 bytes — see [`DASH_MESSAGE_PREFIX_LEN`].
//! Signature output is a 65-byte recoverable compact signature (r||s||v),
//! base64-encoded on the wire.
//!
//! COMPATIBILITY NOTE — the length prefix is a SINGLE byte, not a Bitcoin
//! varint. That mirrors `verifySignature.ts` exactly (it writes
//! `msgbuf.length` into a `Uint8Array`), and matching the server is what
//! matters. It therefore breaks for messages >= 256 bytes: any path that
//! signs a long message must not use this module. Our canonical messages
//! are ~150 bytes, and `MAX_SIGNED_MESSAGE_LEN` asserts the assumption
//! rather than leaving it implicit.

use sha2::{Digest, Sha256};

/// The magic string Dash prepends to signed messages.
pub const DASH_MESSAGE_MAGIC: &str = "Dash Signed Message:\n";

/// The length byte that precedes [`DASH_MESSAGE_MAGIC`].
///
/// This is NOT `DASH_MESSAGE_MAGIC.len()` (which is 21). Dash's specification
/// fixes the prefix at `0x19` == 25, a historical artefact of the original
/// string being longer. Both reference implementations hardcode the literal
/// (`verifySignature.ts` writes `0x19` with the comment
/// `int(25) = len("Dash Signed Message:\n") as per specification`), and the
/// server verifies against that literal — computing it from `len()` produces
/// a different digest and every signature would be rejected. Pinned by
/// `test_magic_prefix_byte_is_the_spec_constant_not_the_string_length`.
pub const DASH_MESSAGE_PREFIX_LEN: u8 = 0x19;

/// Largest message this module will hash. See the compatibility note above:
/// the length prefix is one byte, so 255 is the hard ceiling.
pub const MAX_SIGNED_MESSAGE_LEN: usize = 255;

/// Errors from signed-message operations.
#[derive(Debug, PartialEq, Eq)]
pub enum SignedMessageError {
    /// Message exceeded [`MAX_SIGNED_MESSAGE_LEN`].
    MessageTooLong(usize),
    /// Base64 decoding failed.
    BadBase64(String),
    /// Signature was not 65 bytes.
    BadSignatureLength(usize),
    /// The recovery byte was not 0..=3.
    BadRecoveryId(u8),
    /// The public key was not 33 or 65 bytes.
    BadPublicKeyLength(usize),
    /// Public key bytes were not a valid secp256k1 point.
    BadPublicKey(String),
    /// Signature verification failed.
    VerificationFailed,
}

impl std::fmt::Display for SignedMessageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::MessageTooLong(n) => write!(
                f,
                "signed message is {n} bytes; the single-byte length prefix caps it at {MAX_SIGNED_MESSAGE_LEN}"
            ),
            Self::BadBase64(e) => write!(f, "invalid base64 signature: {e}"),
            Self::BadSignatureLength(n) => {
                write!(f, "signature must be 65 bytes, got {n}")
            }
            Self::BadRecoveryId(v) => write!(f, "invalid recovery id {v} (expected 0..=3)"),
            Self::BadPublicKeyLength(n) => {
                write!(f, "public key must be 33 or 65 bytes, got {n}")
            }
            Self::BadPublicKey(e) => write!(f, "invalid public key: {e}"),
            Self::VerificationFailed => write!(f, "signature verification failed"),
        }
    }
}

impl std::error::Error for SignedMessageError {}

/// Hash a message in the Dash Signed Message format.
///
/// Returns the 32-byte double-SHA256 digest that is actually signed.
pub fn dash_message_hash(message: &str) -> Result<[u8; 32], SignedMessageError> {
    let msgbuf = message.as_bytes();

    // The prefix is a single byte in the reference implementations, so a
    // message of 256+ bytes would silently collide. Refuse instead.
    if msgbuf.len() > MAX_SIGNED_MESSAGE_LEN {
        return Err(SignedMessageError::MessageTooLong(msgbuf.len()));
    }

    let mut prefixed = Vec::with_capacity(1 + DASH_MESSAGE_MAGIC.len() + 1 + msgbuf.len());
    // 0x19 (25) per the Dash specification — deliberately NOT
    // DASH_MESSAGE_MAGIC.len(), which is 21. See DASH_MESSAGE_PREFIX_LEN.
    prefixed.push(DASH_MESSAGE_PREFIX_LEN);
    prefixed.extend_from_slice(DASH_MESSAGE_MAGIC.as_bytes());
    prefixed.push(msgbuf.len() as u8);
    prefixed.extend_from_slice(msgbuf);

    let first = Sha256::digest(&prefixed);
    let second = Sha256::digest(first);

    let mut out = [0u8; 32];
    out.copy_from_slice(&second);
    Ok(out)
}

/// Build the canonical message used by push registration, byte-for-byte
/// identical to `buildCanonicalMessage` in the mobile client
/// (`PushRegistrationService.ts`) and the server (`verifySignature.ts`).
pub fn build_canonical_message(
    action: &str,
    identity_id: &str,
    device_token: &str,
    timestamp: i64,
) -> String {
    [
        format!("action:{action}"),
        format!("identityId:{identity_id}"),
        format!("deviceToken:{device_token}"),
        format!("timestamp:{timestamp}"),
    ]
    .join("\n")
}

/// The action string for a WebSocket handshake.
pub const WS_CONNECT_ACTION: &str = "ws_connect";

/// Build the canonical message used by the WebSocket handshake.
///
/// Deliberately a SEPARATE builder rather than reusing
/// [`build_canonical_message`]. A socket has no push device token, and
/// overloading that field with a session id would make the server logs
/// ambiguous between push and socket authentication (both end up in the
/// same `verifyIdentitySignature` path). The field order and newline
/// separators match the push builder so `verifySignature.ts` can grow a
/// mirror without surprises, but the third field is `sessionId`.
///
/// Mirrored server-side by `buildCanonicalWsMessage` in
/// `evonext-api/src/libs/verifySignature.ts`.
pub fn build_ws_canonical_message(identity_id: &str, session_id: &str, timestamp: i64) -> String {
    [
        format!("action:{WS_CONNECT_ACTION}"),
        format!("identityId:{identity_id}"),
        format!("sessionId:{session_id}"),
        format!("timestamp:{timestamp}"),
    ]
    .join("\n")
}

/// Sign a pre-computed message hash, returning a 65-byte recoverable
/// compact signature (r||s||v).
pub fn sign_hash(private_key: &[u8; 32], hash: &[u8; 32]) -> Result<[u8; 65], SignedMessageError> {
    use k256::ecdsa::signature::hazmat::PrehashSigner;
    use k256::ecdsa::SigningKey;

    let sk = SigningKey::from_bytes(private_key.into())
        .map_err(|e| SignedMessageError::BadPublicKey(format!("invalid private key: {e}")))?;

    let (sig, recid) = sk
        .sign_prehash(hash)
        .map_err(|e| SignedMessageError::BadPublicKey(format!("sign failed: {e}")))?;

    let mut out = [0u8; 65];
    out[..64].copy_from_slice(&sig.to_bytes());
    out[64] = recid.to_byte();
    Ok(out)
}

/// Verify a 65-byte recoverable compact signature against a compressed or
/// uncompressed secp256k1 public key.
pub fn verify_hash(
    hash: &[u8; 32],
    signature: &[u8; 65],
    public_key: &[u8],
) -> Result<(), SignedMessageError> {
    use k256::ecdsa::signature::hazmat::PrehashVerifier;
    use k256::ecdsa::{Signature, VerifyingKey};

    let vk = VerifyingKey::from_sec1_bytes(public_key)
        .map_err(|e| SignedMessageError::BadPublicKey(e.to_string()))?;

    let sig = Signature::from_slice(&signature[..64])
        .map_err(|e| SignedMessageError::BadPublicKey(format!("invalid signature: {e}")))?;

    vk.verify_prehash(hash, &sig)
        .map_err(|_| SignedMessageError::VerificationFailed)
}

/// Sign a message string, returning the base64 compact signature exactly as
/// the mobile client transmits it.
pub fn sign_message_base64(
    private_key: &[u8; 32],
    message: &str,
) -> Result<String, SignedMessageError> {
    use base64::Engine;

    let hash = dash_message_hash(message)?;
    let sig = sign_hash(private_key, &hash)?;
    Ok(base64::engine::general_purpose::STANDARD.encode(sig))
}

/// Decode a Wire WIF (Wallet Import Format) into 32 bytes of secp256k1 key
/// material.
///
/// Deliberately does NOT reuse `bitcoin`'s WIF parser here because the mobile
/// client hand-rolls the same decode and we want a single, auditable
/// implementation shared with tests. Format:
/// `(version)(32-byte key)(0x01 compressed)` + 4-byte double-SHA256 checksum.
///
/// The version byte is accepted for BOTH Dash networks:
///   * `0x80` — mainnet (WIFs beginning with `X`, `K`, or `L`)
///   * `0xef` — testnet (WIFs beginning with `c`)
///
/// REGRESSION (found 2026-09-20): only `0x80` was accepted, so every WIF the
/// app actually stores on the default (`testnet`) network was rejected here.
/// That silently disabled both push registration and the WebSocket handshake.
/// The version byte is a network marker and carries no key material, so
/// accepting both cannot admit a wrong key — only the 32 bytes after it are
/// used, and the trailing checksum is still validated.
pub fn decode_wif(wif: &str) -> Result<[u8; 32], SignedMessageError> {
    use bitcoin::base58;

    let raw = base58::decode_check(wif)
        .map_err(|e| SignedMessageError::BadBase64(format!("invalid WIF: {e}")))?;

    // decode_check strips the 4-byte checksum and validates it.
    // Expect 33 bytes (version + 32) or 34 bytes (version + 32 + 0x01).
    if raw.len() != 33 && raw.len() != 34 {
        return Err(SignedMessageError::BadPublicKeyLength(raw.len()));
    }

    // NOTE: 0x80 = mainnet, 0xef = testnet. Any other value is rejected.
    const WIF_VERSION_MAINNET: u8 = 0x80;
    const WIF_VERSION_TESTNET: u8 = 0xef;

    if raw[0] != WIF_VERSION_MAINNET && raw[0] != WIF_VERSION_TESTNET {
        return Err(SignedMessageError::BadPublicKey(format!(
            "unexpected WIF version byte 0x{:02x}",
            raw[0]
        )));
    }

    let mut key = [0u8; 32];
    key.copy_from_slice(&raw[1..33]);
    Ok(key)
}

#[cfg(test)]
mod tests;
