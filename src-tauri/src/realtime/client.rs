// src-tauri/src/realtime/client.rs
//
//! The WebSocket client loop: connect, authenticate, heartbeat, reconnect.
//!
//! Gated behind the `realtime` Cargo feature.

use std::time::{Duration, SystemTime, UNIX_EPOCH};

use futures::{SinkExt, StreamExt};
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tokio_tungstenite::tungstenite::Message;

use super::backoff::Backoff;
use super::protocol::{
    build_handshake_query, parse_server_frame, PingFrame, ServerFrame, DEFAULT_HUB_URL,
    HEARTBEAT_INTERVAL_SECS,
};
use super::state::RealtimeState;
use super::{EVENT_NOTIFY, EVENT_STATUS};

/// Current unix time in seconds.
fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Generate a session id for the handshake.
///
/// Uniqueness is what stops a captured handshake from being replayed within
/// the server's 300s window, so this must not be a constant. A random v4 UUID
/// is used rather than a counter because a counter restarts at 0 on every app
/// launch, which would repeat session ids across restarts.
fn new_session_id() -> String {
    format!("sess-{}", uuid_like())
}

/// Produce a UUID-v4-shaped random string from the OS RNG.
///
/// NOTE: Delegates to [`super::uuid::uuid_like`], which lives outside the
///       `realtime` feature gate so the device identity can mint a token in
///       builds without the socket client.
fn uuid_like() -> String {
    super::uuid::uuid_like()
}

/// Shared handle controlling the client's lifetime.
///
/// NOTE: Defined in [`super::state`] so it exists in builds without the
///       `realtime` feature, where the Tauri commands still need it.
pub use super::state::RealtimeHandle;

/// Emit a status change to the frontend.
fn emit_status<R: Runtime>(app: &AppHandle<R>, status: &str) {
    let _ = app.emit(EVENT_STATUS, status);
}

/// Sign the handshake and build the full connection URL.
///
/// Returns `None` if the identity has no usable signing key, which is a
/// normal condition (a write-only connection has no private keys).
pub fn build_authenticated_url(
    identity_id: &str,
    wif: &str,
    session_id: &str,
    timestamp: i64,
) -> Option<String> {
    /* Decode the key. */
    let key = crate::crypto::signed_message::decode_wif(wif).ok()?;

    /* Build the canonical message. */
    let message = crate::crypto::signed_message::build_ws_canonical_message(
        identity_id,
        session_id,
        timestamp,
    );

    /* Sign it. */
    let signature = crate::crypto::signed_message::sign_message_base64(&key, &message).ok()?;

    /* Build the query string. */
    let query = build_handshake_query(identity_id, session_id, timestamp, &signature);

    Some(format!("{DEFAULT_HUB_URL}?{query}"))
}

/// Run the realtime client until stopped.
///
/// `wif` is the identity's authentication private key in Wallet Import
/// Format, read from the encrypted vault by the caller. It is NOT logged.
pub async fn run<R: Runtime>(app: AppHandle<R>, identity_id: String, wif: String) {
    let backoff = Backoff::default();
    let mut attempt: u32 = 0;

    loop {
        /* Check for a stop request. */
        {
            let state = app.state::<RealtimeState>();
            let guard = state.handle.lock().await;

            if let Some(handle) = guard.as_ref() {
                if handle.is_stopped() {
                    emit_status(&app, "disconnected");
                    return;
                }
            }
        }

        /* Build a fresh handshake. */
        // NOTE: A NEW session id and timestamp per attempt, because the
        //       server's replay window would reject a reused pair.
        let session_id = new_session_id();
        let timestamp = now_secs();

        let url = match build_authenticated_url(&identity_id, &wif, &session_id, timestamp) {
            Some(u) => u,
            None => {
                // NOTE: Unsignable identity is not retryable — looping would
                //       spin forever against a permanent condition.
                emit_status(&app, "disconnected");
                return;
            }
        };

        /* Announce the attempt. */
        emit_status(&app, "connecting");

        /* Connect. */
        match tokio_tungstenite::connect_async(&url).await {
            Ok((stream, _response)) => {
                /* Reset backoff on a successful connection. */
                attempt = 0;
                emit_status(&app, "connected");

                /* Serve the socket until it drops. */
                // NOTE: `serve_socket` returns `()`, so its result carries no
                //       information to act on. Awaiting it IS the work; the
                //       outcome is intentionally ignored (clippy flagged the
                //       old `let _ = served;` as a unit binding with no
                //       effect). The await is what keeps the socket alive.
                serve_socket(&app, stream).await;

                // NOTE: Falling through reconnects regardless of whether the
                //       socket ended cleanly — the hub evicting the object
                //       looks like a clean close, and the client must
                //       reconnect either way.
            }
            Err(_e) => {
                // NOTE: Deliberately not logging the URL — it carries the
                //       handshake signature.
                emit_status(&app, "disconnected");
            }
        }

        /* Check for a stop request before sleeping. */
        {
            let state = app.state::<RealtimeState>();
            let guard = state.handle.lock().await;

            if let Some(handle) = guard.as_ref() {
                if handle.is_stopped() {
                    return;
                }
            }
        }

        /* Back off before retrying. */
        let jitter_seed = rand::RngCore::next_u64(&mut rand::rng());
        let delay = backoff.delay_with_jitter(attempt, jitter_seed);
        attempt = attempt.saturating_add(1);

        tokio::time::sleep(delay).await;
    }
}

/// Pump a single connection: forward events, send heartbeats.
///
/// Returns when the socket closes or errors.
async fn serve_socket<S, R: Runtime>(
    app: &AppHandle<R>,
    stream: tokio_tungstenite::WebSocketStream<S>,
) where
    S: tokio::io::AsyncRead + tokio::io::AsyncWrite + Unpin,
{
    /* Split for concurrent read/write. */
    let (mut write, mut read) = stream.split();

    /* Heartbeat ticker. */
    let mut ticker = tokio::time::interval(Duration::from_secs(HEARTBEAT_INTERVAL_SECS));

    // NOTE: The first tick fires immediately; consume it so the first ping is
    //       one interval after connect rather than at t=0.
    ticker.tick().await;

    loop {
        tokio::select! {
            /* Outbound heartbeat. */
            _ = ticker.tick() => {
                let ping = PingFrame::new();
                let json = match serde_json::to_string(&ping) {
                    Ok(j) => j,
                    Err(_) => continue,
                };

                if write.send(Message::Text(json.into())).await.is_err() {
                    // NOTE: A failed heartbeat means the socket is dead.
                    //       Returning triggers reconnect.
                    return;
                }
            }

            /* Inbound frame. */
            incoming = read.next() => {
                match incoming {
                    Some(Ok(Message::Text(text))) => {
                        handle_text_frame(app, &text);
                    }
                    Some(Ok(Message::Binary(bytes))) => {
                        // NOTE: The protocol is text-only, but a binary frame
                        //       must not tear down the connection.
                        if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                            handle_text_frame(app, &text);
                        }
                    }
                    Some(Ok(Message::Ping(payload))) => {
                        // NOTE: tungstenite auto-responds to protocol pings,
                        //       so this arm only keeps the stream drained.
                        let _ = write.send(Message::Pong(payload)).await;
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        // NOTE: A clean close is what a Durable Object
                        //       eviction looks like. Reconnect.
                        return;
                    }
                    Some(Ok(_)) => {
                        // NOTE: Pong / Frame are handled by the protocol
                        //       layer; nothing to do.
                    }
                    Some(Err(_)) => {
                        return;
                    }
                }
            }
        }
    }
}

/// Parse and forward a server text frame to the frontend.
fn handle_text_frame<R: Runtime>(app: &AppHandle<R>, text: &str) {
    /* Parse. */
    let frame = match parse_server_frame(text) {
        Some(f) => f,
        // NOTE: Unrecognised frames are dropped, not fatal — the server may
        //       add frame types without a client release.
        None => return,
    };

    /* Forward notification events. */
    if let ServerFrame::Event(event) = frame {
        let _ = app.emit(EVENT_NOTIFY, event);
    }

    // NOTE: Pongs need no forwarding; their only purpose is keeping the TCP
    //       path warm and surfacing a dead socket to the heartbeat above.
}
