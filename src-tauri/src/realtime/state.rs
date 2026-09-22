// src-tauri/src/realtime/state.rs
//
//! Shared realtime connection state.
//!
//! WHY THIS IS SEPARATE FROM `client`
//! ----------------------------------
//! `client` (the WebSocket loop) is gated behind the `realtime` Cargo feature,
//! but the Tauri command handlers listed in `generate_handler!` must exist in
//! EVERY build configuration — a macro argument list cannot be conditionally
//! compiled per-entry. So the handle and the managed state live here, outside
//! the gate, and the gated client uses them.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use tokio::sync::Mutex;

/// Shared handle controlling the client's lifetime.
#[derive(Clone)]
pub struct RealtimeHandle {
    /// Set to true to stop the loop after the current attempt.
    stop: Arc<AtomicBool>,
}

impl RealtimeHandle {
    /// Create a fresh, un-stopped handle.
    ///
    /// A connect command must install a handle before spawning the client
    /// loop, because the loop only ever READS the handle to detect a stop
    /// request. If nothing installs one, the stop path is unreachable and the
    /// loop can only end when the process exits.
    pub fn new() -> Self {
        Self {
            stop: Arc::new(AtomicBool::new(false)),
        }
    }

    /// Signal the client loop to stop.
    pub fn stop(&self) {
        self.stop.store(true, Ordering::SeqCst);
    }

    /// Whether a stop has been requested.
    pub fn is_stopped(&self) -> bool {
        self.stop.load(Ordering::SeqCst)
    }
}

impl Default for RealtimeHandle {
    fn default() -> Self {
        Self::new()
    }
}

/// Runtime state for the realtime client, stored in Tauri's managed state.
pub struct RealtimeState {
    pub handle: Mutex<Option<RealtimeHandle>>,
}

impl Default for RealtimeState {
    fn default() -> Self {
        Self {
            handle: Mutex::new(None),
        }
    }
}
