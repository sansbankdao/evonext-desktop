// src-tauri/src/crypto/mod.rs
//
//! Cryptographic primitives that must be byte-compatible with the mobile
//! client and the EvoNext API. See `signed_message` for the Dash Signed
//! Message format used to authenticate push-device registration.

pub mod signed_message;
pub mod tls;
