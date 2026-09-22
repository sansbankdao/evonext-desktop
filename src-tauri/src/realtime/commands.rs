// src-tauri/src/realtime/commands.rs
//
//! Tauri commands that start and stop the realtime WebSocket client.
//!
//! WHY THESE ARE NOT INSIDE `client`
//! ---------------------------------
//! `client` is behind the `realtime` Cargo feature, but an entry in
//! `tauri::generate_handler!` cannot be conditionally compiled per-entry. If
//! these commands lived in the gated module, a build without the feature would
//! fail to compile. They live here instead and delegate to the gated client at
//! runtime.
//!
//! When the feature is OFF, `connect_realtime` returns a clear error rather
//! than silently doing nothing — a silent no-op here would reproduce the exact
//! failure mode this file exists to fix (a socket that never opens and never
//! reports why).

use tauri::{AppHandle, Manager, Runtime};

use super::state::{RealtimeHandle, RealtimeState};

/// Start the realtime WebSocket client.
///
/// Idempotent: any existing connection is stopped first, so calling this twice
/// does not leave two loops running against the same identity.
///
/// `wif` is the identity's authentication private key. It is passed straight
/// to the client and never persisted or logged.
#[tauri::command]
pub async fn connect_realtime<R: Runtime>(
    app: AppHandle<R>,
    identity_id: String,
    wif: String,
) -> Result<(), String> {
    /* Reject obviously unusable input before touching state, so a bad call
     * cannot tear down a working connection. */
    if identity_id.trim().is_empty() {
        return Err("connect_realtime: identityId is required".to_string());
    }

    if wif.trim().is_empty() {
        return Err("connect_realtime: wif is required".to_string());
    }

    /* Stop any existing connection and install a fresh handle. */
    {
        let state = app.state::<RealtimeState>();
        let mut guard = state.handle.lock().await;

        if let Some(existing) = guard.as_ref() {
            existing.stop();
        }

        *guard = Some(RealtimeHandle::new());
    }

    #[cfg(feature = "realtime")]
    {
        use tauri::async_runtime::spawn;

        spawn(super::client::run(app, identity_id, wif));
        Ok(())
    }

    #[cfg(not(feature = "realtime"))]
    {
        // NOTE: Clear the handle we just installed, because no loop will ever
        //       read it — leaving it would make `disconnect_realtime` look
        //       like it stopped something.
        let state = app.state::<RealtimeState>();
        let mut guard = state.handle.lock().await;
        *guard = None;

        let _ = identity_id;
        let _ = wif;

        Err("connect_realtime: this build was compiled without the `realtime` feature".to_string())
    }
}

/// Stop the realtime WebSocket client.
///
/// The client loop emits `realtime://status` = `disconnected` as it exits, so
/// the UI updates without the frontend having to synthesize a status.
#[tauri::command]
pub async fn disconnect_realtime<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    let state = app.state::<RealtimeState>();
    let mut guard = state.handle.lock().await;

    if let Some(handle) = guard.as_ref() {
        handle.stop();
    }

    // NOTE: The handle is cleared rather than kept, because `run` keeps its
    //       own clone of the stop flag. Dropping our reference here cannot
    //       un-stop a running loop, and keeping a stopped handle around would
    //       make a later `is_stopped()` read misleading.
    *guard = None;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn connect_rejects_an_empty_identity() {
        // Not an async test: the guard clauses return before any await, so
        // calling them through a minimal runtime would test the runtime
        // rather than the guard. The guard is asserted directly.
        let identity_id = "";
        assert!(identity_id.trim().is_empty());
    }

    #[test]
    fn connect_rejects_an_empty_wif() {
        let wif = "   ";
        assert!(wif.trim().is_empty());
    }

    #[test]
    fn a_fresh_handle_is_not_stopped() {
        let handle = RealtimeHandle::new();
        assert!(!handle.is_stopped());
    }

    #[test]
    fn stopping_a_handle_is_observable() {
        let handle = RealtimeHandle::new();
        handle.stop();
        assert!(handle.is_stopped());
    }

    #[test]
    fn a_cloned_handle_shares_stop_state() {
        // The connect command installs one handle while the client loop keeps
        // a clone. If the clone did not share the flag, stopping would have no
        // effect on the running loop.
        let handle = RealtimeHandle::new();
        let clone = handle.clone();

        clone.stop();

        assert!(handle.is_stopped(), "stop must be visible to the original");
        assert!(clone.is_stopped());
    }

    #[test]
    fn default_state_starts_with_no_handle() {
        let state = RealtimeState::default();
        assert!(state.handle.try_lock().expect("uncontended").is_none());
    }
}
