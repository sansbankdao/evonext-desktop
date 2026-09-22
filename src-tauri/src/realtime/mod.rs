// src-tauri/src/realtime/mod.rs
//
//! Realtime notification client for EvoNext Desktop.
//!
//! Connects to the unversioned WebSocket hub at `wss://evonext.app/ws/connect` and
//! relays server-pushed events to the frontend as Tauri events.
//!
//! DESIGN NOTES (read before changing)
//! -----------------------------------
//! 1. The hub is a single global Durable Object using the STANDARD
//!    (non-hibernating) WebSocket API. Cloudflare evicts an idle object and
//!    that DROPS the socket. Reconnect is therefore REQUIRED, not optional —
//!    see [`backoff`].
//! 2. The server never initiates traffic. This client owns the heartbeat.
//! 3. The handshake reuses the Dash Signed Message primitives in
//!    [`crate::crypto::signed_message`], which are byte-verified against
//!    `evonext-api/src/libs/verifySignature.ts`.
//!
//! The whole module is gated behind the `realtime` Cargo feature so a
//! from-source build can omit it entirely.

pub mod backoff;
pub mod commands;
pub mod device;
pub mod protocol;
pub mod register;
pub mod state;
pub mod uuid;

#[cfg(feature = "realtime")]
pub mod client;

#[cfg(all(test, feature = "realtime"))]
mod live_tests;

/// Tauri event name emitted for each server notification.
///
/// The frontend listens for this single event and switches on `payload.type`.
pub const EVENT_NOTIFY: &str = "realtime://notify";

/// Tauri event name emitted when the connection state changes.
///
/// Payload is a string: `connecting`, `connected`, or `disconnected`.
pub const EVENT_STATUS: &str = "realtime://status";
