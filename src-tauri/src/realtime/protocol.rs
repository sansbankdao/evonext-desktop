// src-tauri/src/realtime/protocol.rs
//
//! Wire types for the `wss://evonext.app/ws/connect` notification hub.
//!
//! The server's inbound surface is deliberately tiny: the ONLY frame a client
//! sends is `{"type":"ping"}`. Everything else flows server -> client. These
//! types are the client half of that contract; the server side lives in
//! `evonext-api/src/durable/NotifyHub.ts` and `evonext-api/src/ws.ts`.

use serde::{Deserialize, Serialize};

/// The single client -> server frame.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PingFrame {
    #[serde(rename = "type")]
    pub kind: String,
}

impl PingFrame {
    pub fn new() -> Self {
        Self {
            kind: "ping".to_string(),
        }
    }
}

impl Default for PingFrame {
    fn default() -> Self {
        Self::new()
    }
}

/// Server -> client pong, echoing the hub's clock.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PongFrame {
    #[serde(rename = "type")]
    pub kind: String,
    /// Hub-side epoch milliseconds when the pong was produced.
    pub t: i64,
}

/// A notification event delivered by the hub.
///
/// `kind` is the discriminator the server sets in `data.type` of the push
/// payloads (e.g. `yappr_new_post`, `yappr_new_posts`, `registrar_ready`).
/// Unknown kinds MUST be tolerated: the server can add event types without a
/// client release, and a client that errors on an unknown kind would drop the
/// connection on a purely additive server change.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotifyEvent {
    #[serde(rename = "type")]
    pub kind: String,

    /// Free-form payload. Kept as `serde_json::Value` because the shape
    /// varies per `kind` and pinning it here would couple the client to
    /// every server-side event change.
    #[serde(flatten)]
    pub data: serde_json::Value,
}

/// Anything the server may send.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ServerFrame {
    /// A pong reply to our heartbeat.
    Pong(PongFrame),
    /// A notification event.
    Event(NotifyEvent),
}

/// Parse a server text frame.
///
/// Returns `None` for anything unrecognised rather than an error: the server
/// is free to add frame types, and an unknown frame must not tear down the
/// connection.
pub fn parse_server_frame(raw: &str) -> Option<ServerFrame> {
    /* Try a typed parse first. */
    if let Ok(frame) = serde_json::from_str::<ServerFrame>(raw) {
        return Some(frame);
    }

    // NOTE: The untagged enum above requires a `type` field, and `PongFrame`
    //       is tried before `NotifyEvent`, so a pong is matched by shape.
    //       Anything else (including a future frame type) lands here.
    None
}

/// Build the canonical WebSocket handshake query string.
///
/// The parameters are identical to what `evonext-api/src/ws.ts` reads, and
/// `signature` must be a base64 ECDSA signature over
/// [`crate::crypto::signed_message::build_ws_canonical_message`].
pub fn build_handshake_query(
    identity_id: &str,
    session_id: &str,
    timestamp: i64,
    signature_b64: &str,
) -> String {
    // NOTE: Percent-encoding is required because a base64 signature contains
    //       '+', '/' and '=', all of which are unsafe in a query string and
    //       would be mis-parsed server-side ('+' decodes as a space).
    let enc = |s: &str| urlencode(s);

    format!(
        "identityId={}&sessionId={}&timestamp={}&signature={}",
        enc(identity_id),
        enc(session_id),
        timestamp,
        enc(signature_b64),
    )
}

/// Minimal RFC 3986 percent-encoding for query-string values.
///
/// Hand-rolled to avoid pulling in a URL crate for four fields. Encodes
/// everything outside the unreserved set, which is always safe.
fn urlencode(input: &str) -> String {
    let mut out = String::with_capacity(input.len());

    for byte in input.as_bytes() {
        match byte {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                out.push(*byte as char)
            }
            _ => out.push_str(&format!("%{byte:02X}")),
        }
    }

    out
}

/// Extract the host/path portion of the hub URL for the handshake.
///
/// Kept separate so tests can assert the exact production endpoint without a
/// network call.
// NOTE: `/ws/connect`, NOT the bare `/ws`.
//       Cloudflare zone routes match an EXACT pattern without the query
//       string only. A request to `wss://evonext.app/ws?identityId=...`
//       therefore misses the `evonext.app/ws` rule and is answered by the
//       website origin (404 text/html) instead of the worker. The
//       `evonext.app/ws/*` wildcard DOES match `/ws/connect?...`, so the
//       socket path carries the extra segment deliberately.
pub const DEFAULT_HUB_URL: &str = "wss://evonext.app/ws/connect";

/// How often the client sends a heartbeat.
///
/// The server never initiates traffic, and with the non-hibernating API a
/// silently dropped TCP connection is indistinguishable from an idle one.
/// A 30s ping means a dead socket is detected in well under a minute instead
/// of at the next notification (which could be hours).
pub const HEARTBEAT_INTERVAL_SECS: u64 = 30;

/// How long to wait for a pong before treating the socket as dead.
pub const HEARTBEAT_TIMEOUT_SECS: u64 = 10;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ping_frame_serialises_with_type_field() {
        let frame = PingFrame::new();
        let json = serde_json::to_string(&frame).expect("serialise");

        // The server reads `payload?.type === 'ping'`; a renamed field would
        // silently stop all heartbeats.
        assert_eq!(json, r#"{"type":"ping"}"#);
    }

    #[test]
    fn test_parse_pong_frame() {
        let raw = r#"{"type":"pong","t":1789835811000}"#;
        let frame = parse_server_frame(raw).expect("must parse");

        match frame {
            ServerFrame::Pong(p) => {
                assert_eq!(p.kind, "pong");
                assert_eq!(p.t, 1789835811000);
            }
            other => panic!("expected Pong, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_notify_event_with_flattened_data() {
        let raw = r#"{"type":"yappr_new_post","postId":"abc","ownerId":"def"}"#;
        let frame = parse_server_frame(raw).expect("must parse");

        match frame {
            ServerFrame::Event(e) => {
                assert_eq!(e.kind, "yappr_new_post");
                assert_eq!(e.data["postId"], "abc");
                assert_eq!(e.data["ownerId"], "def");
            }
            other => panic!("expected Event, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_unknown_event_kind_still_succeeds() {
        // Forward compatibility: a new server event type must not be an error.
        let raw = r#"{"type":"some_future_event","whatever":42}"#;
        let frame = parse_server_frame(raw).expect("unknown kinds must parse");

        match frame {
            ServerFrame::Event(e) => assert_eq!(e.kind, "some_future_event"),
            other => panic!("expected Event, got {other:?}"),
        }
    }

    #[test]
    fn test_parse_rejects_garbage_without_panicking() {
        assert!(parse_server_frame("not json").is_none());
        assert!(parse_server_frame("").is_none());
        assert!(parse_server_frame("{}").is_none());
        assert!(parse_server_frame("[]").is_none());
        assert!(parse_server_frame("null").is_none());
    }

    #[test]
    fn test_handshake_query_encodes_base64_signature() {
        // A base64 signature contains '+' which decodes to SPACE if sent raw.
        let sig = "ab+cd/ef==";
        let q = build_handshake_query("ID", "sess", 1789835811, sig);

        assert!(q.contains("signature=ab%2Bcd%2Fef%3D%3D"), "got: {q}");
        assert!(!q.contains('+'), "raw '+' must never appear in the query");
    }

    #[test]
    fn test_handshake_query_has_all_four_fields() {
        let q = build_handshake_query("ID", "sess", 1789835811, "sig");
        assert!(q.contains("identityId=ID"));
        assert!(q.contains("sessionId=sess"));
        assert!(q.contains("timestamp=1789835811"));
        assert!(q.contains("signature=sig"));
    }

    #[test]
    fn test_handshake_query_field_names_match_the_server() {
        // These exact names are read by `url.searchParams.get(...)` in
        // evonext-api/src/ws.ts. A rename here breaks every handshake.
        let q = build_handshake_query("a", "b", 1, "c");
        for field in ["identityId=", "sessionId=", "timestamp=", "signature="] {
            assert!(q.contains(field), "missing {field} in {q}");
        }
    }

    #[test]
    fn test_urlencode_passes_unreserved_and_escapes_the_rest() {
        assert_eq!(urlencode("abcXYZ019-_.~"), "abcXYZ019-_.~");
        assert_eq!(urlencode("+"), "%2B");
        assert_eq!(urlencode("/"), "%2F");
        assert_eq!(urlencode("="), "%3D");
        assert_eq!(urlencode(" "), "%20");
    }

    #[test]
    fn test_default_hub_url_is_the_agreed_endpoint() {
        // Owner-approved, unversioned endpoint (bypasses Hono basePath /v1).
        assert_eq!(DEFAULT_HUB_URL, "wss://evonext.app/ws/connect");
    }

    #[test]
    fn test_heartbeat_interval_is_shorter_than_the_server_replay_window() {
        // Sanity: the heartbeat is about liveness, not auth, but a heartbeat
        // longer than the 300s auth window would be a smell.
        assert!(HEARTBEAT_INTERVAL_SECS < 300);
        assert!(HEARTBEAT_TIMEOUT_SECS < HEARTBEAT_INTERVAL_SECS);
    }
}
