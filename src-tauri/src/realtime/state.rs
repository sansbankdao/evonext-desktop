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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_fresh_handle_is_not_stopped() {
        assert!(!RealtimeHandle::new().is_stopped());
    }

    #[test]
    fn stop_is_visible_through_every_clone() {
        // The client loop clones the handle installed at spawn time, so the
        // stop signal must reach the loop through that clone.
        let handle = RealtimeHandle::new();
        let loops_copy = handle.clone();

        handle.stop();

        assert!(handle.is_stopped());
        assert!(loops_copy.is_stopped());
    }

    #[test]
    fn replacing_the_state_handle_does_not_unstop_the_previous_one() {
        // REGRESSION — 2026-10 joint fan-out test: the client loop used to
        // read its stop flag from THIS shared slot, so installing a fresh
        // handle (a second connect) or clearing it (disconnect) made the
        // running loop's stop request unreachable, and it retried forever —
        // the hub observed one identity holding three WebSockets. The loop
        // now clones its handle at spawn; this pins the handle semantics
        // that make an orphaned clone harmless: it keeps its own flag,
        // unaffected by later mutations of the slot.
        let state = RealtimeState::default();

        let first = RealtimeHandle::new();
        let orphaned = first.clone();

        {
            let mut guard = state.handle.blocking_lock();
            *guard = Some(first);
        }

        /* A second connect installs a fresh handle... */
        {
            let mut guard = state.handle.blocking_lock();
            *guard = Some(RealtimeHandle::new());
        }

        /* ...and a disconnect clears the slot. Neither may touch the
         * orphaned clone's flag. */
        {
            let mut guard = state.handle.blocking_lock();
            *guard = None;
        }

        assert!(!orphaned.is_stopped());

        /* Stopping through the clone still works — that is the signal the
         * loop relies on. */
        orphaned.stop();
        assert!(orphaned.is_stopped());
    }
}
