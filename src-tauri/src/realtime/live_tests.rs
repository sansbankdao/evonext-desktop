// src-tauri/src/realtime/live_tests.rs
//
//! Live, opt-in tests against the production notification hub.
//!
//! These are `#[ignore]`d because they need a real identity private key and
//! network access. They exist because the failure this module was written to
//! catch is *silent*: every unit test passed while the socket never opened.
//! Only a real handshake against the real server can prove otherwise.
//!
//! Run with:
//! ```text
//! EVONEXT_LIVE_WIF='c...' \
//! EVONEXT_LIVE_IDENTITY='<base58 identity>' \
//!   cargo test --lib --features realtime realtime::live_tests -- --ignored --nocapture
//! ```
//!
//! The WIF is read from the environment and never written to disk or logged.

#![cfg(feature = "realtime")]

use std::time::Duration;

use futures::{SinkExt, StreamExt};
use tokio_tungstenite::tungstenite::Message;

use super::client::build_authenticated_url;
use super::protocol::DEFAULT_HUB_URL;

/// Install the TLS provider the same way `lib.rs` does at startup.
///
/// A test binary does not run `.setup()`, so without this the live socket test
/// panics with "Could not automatically determine the process-level
/// CryptoProvider" — a panic that has nothing to do with the code under test.
/// Calling it here reproduces production's precondition instead of masking it.
fn install_provider() {
    crate::crypto::tls::install_tls_provider();
}

/// Read the required environment variables, or `None` if unset.
fn live_credentials() -> Option<(String, String)> {
    let identity = std::env::var("EVONEXT_LIVE_IDENTITY").ok()?;
    let wif = std::env::var("EVONEXT_LIVE_WIF").ok()?;

    if identity.trim().is_empty() || wif.trim().is_empty() {
        return None;
    }

    Some((identity, wif))
}

/// Skip helper so an unconfigured run is explicit rather than a false pass.
fn require_credentials() -> (String, String) {
    match live_credentials() {
        Some(c) => c,
        None => panic!("set EVONEXT_LIVE_IDENTITY and EVONEXT_LIVE_WIF to run this live test"),
    }
}

#[tokio::test]
#[ignore = "requires live credentials and network"]
async fn live_testnet_wif_produces_a_signed_url() {
    // REGRESSION GUARD (2026-09-20): before `decode_wif` accepted the testnet
    // version byte 0xef, this returned None for every real testnet key, so the
    // client exited immediately and no socket was ever attempted.
    let (identity, wif) = require_credentials();

    let url = build_authenticated_url(&identity, &wif, "sess-live-test", 1789835811);

    assert!(
        url.is_some(),
        "a real testnet WIF must produce a signed URL (0xef regression)"
    );

    let url = url.expect("checked above");

    assert!(url.starts_with(DEFAULT_HUB_URL));
    assert!(url.contains("signature="));
    assert!(url.contains("identityId="));
}

#[tokio::test]
#[ignore = "requires live credentials and network"]
async fn live_socket_opens_and_the_server_sees_it() {
    // THE ACCEPTANCE TEST. Success is measured externally by
    // `GET https://evonext.app/ws/stats` reporting `sockets: 1` while this
    // task holds the connection open.
    //
    // Fetch the counter before and after, from the shell:
    //   curl -s https://evonext.app/ws/stats
    let (identity, wif) = require_credentials();

    install_provider();

    let session_id = format!("sess-live-{}", super::uuid::uuid_like());
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    let url = build_authenticated_url(&identity, &wif, &session_id, timestamp).expect("signed URL");

    println!("connecting to {DEFAULT_HUB_URL}");

    let (mut stream, response) = tokio_tungstenite::connect_async(&url)
        .await
        .expect("handshake must succeed with a valid signature");

    println!("HTTP status: {}", response.status());

    assert_eq!(
        response.status().as_u16(),
        101,
        "a 401 here means the server rejected the signature (verifier not deployed, or a format mismatch)"
    );

    // Hold the socket open briefly so an observer can read /ws/stats.
    let hold = Duration::from_secs(5);
    let deadline = tokio::time::Instant::now() + hold;

    loop {
        let remaining = deadline.saturating_duration_since(tokio::time::Instant::now());

        if remaining.is_zero() {
            break;
        }

        match tokio::time::timeout(remaining, stream.next()).await {
            Ok(Some(Ok(Message::Close(_)))) => panic!("server closed the socket immediately"),
            Ok(Some(Err(e))) => panic!("socket error: {e}"),
            Ok(Some(Ok(_))) => continue,
            Ok(None) => panic!("stream ended immediately"),
            Err(_) => break,
        }
    }

    /* A clean close must not panic. */
    let _ = stream.send(Message::Close(None)).await;
}

/// THE FAN-OUT PREREQUISITE.
///
/// `GET /ws/connect` proves a desktop socket can be accepted. It does NOT prove
/// the desktop can be DISCOVERED: the manager fan-out finds recipients by
/// querying `push_devices` for a non-null `identityId`, so an identity with no
/// row there receives nothing, no matter how healthy its socket is.
///
/// This test exercises `POST /v1/push/register` with a real signature, which is
/// the only path that creates that row for a desktop installation.
///
/// Both this endpoint and `/ws/connect` call the same `verifyIdentitySignature`
/// routine, so a verifier regression breaks both together — which is exactly
/// why this is asserted separately rather than inferred from the socket test.
///
/// Uses `build_registration_payload` (the production builder) so the signature
/// under test is byte-identical to the one the app sends. The device token is
/// test-only and is NOT persisted to the app store: this test must not clobber
/// a real installation's stable token.
#[tokio::test]
#[ignore = "requires live credentials and network"]
async fn live_registration_creates_a_push_devices_row() {
    let (identity, wif) = require_credentials();

    install_provider();

    /* Mint an ephemeral, test-only token (never persisted). */
    let device_token = format!("desktop-livetest-{}", super::uuid::uuid_like());

    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);

    /* Build the payload with the PRODUCTION builder. */
    let body = super::register::build_registration_payload(&identity, &device_token, &wif, timestamp)
        .expect("registration payload must be buildable from a valid testnet WIF");

    println!("registering deviceToken={device_token} for identity={identity}");

    /* POST it to the live API. */
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .expect("http client");

    let response = client
        .post("https://evonext.app/v1/push/register")
        .json(&body)
        .send()
        .await
        .expect("registration request must reach the API");

    let status = response.status();
    let text = response.text().await.unwrap_or_default();

    println!("HTTP status: {status}");
    println!("response body: {text}");

    // A 401 here means the verifier rejected a signature this client built with
    // its own production code path. Because the same routine guards
    // `/ws/connect`, a 401 is NOT a registration-only failure.
    assert!(
        status.is_success(),
        "registration must succeed; got {status} with body {text}"
    );

    let parsed: serde_json::Value =
        serde_json::from_str(&text).expect("response must be valid JSON");

    assert_eq!(
        parsed.get("success").and_then(|v| v.as_bool()),
        Some(true),
        "server must report success:true, got {parsed}"
    );
}
