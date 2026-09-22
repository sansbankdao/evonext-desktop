// src-tauri/src/realtime/register.rs
//
//! Register this desktop installation with the notification fan-out.
//!
//! WHY THIS EXISTS
//! ---------------
//! The manager fan-out discovers recipients by querying `push_devices`. A
//! desktop client has no real push token, so it registers a random UUID as its
//! `deviceToken`. The UUID is meaningless for delivery — it exists only to
//! satisfy `deviceToken TEXT NOT NULL UNIQUE` and to give this installation a
//! stable key.
//!
//! This is the ONE piece of the realtime stack that must work even when the
//! `realtime` Cargo feature is disabled: it is what makes a desktop client
//! discoverable. It is therefore always compiled.

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Runtime};

use crate::crypto::signed_message::{build_canonical_message, decode_wif, sign_message_base64};
use crate::utils::StoreManager;

use super::device::{DeviceIdentity, DEVICE_STORE_PATH, DEVICE_TOKEN_KEY, PLATFORM_DESKTOP};

/// The action string accepted by the API's `POST /v1/push/register` endpoint.
///
/// Reusing the push action is deliberate: the server builds its canonical
/// message from `(action, identityId, deviceToken, timestamp)` for this
/// action, and a desktop UUID is a perfectly valid `deviceToken`. A separate
/// action would require a server change for no gain.
pub const PUSH_REGISTER_ACTION: &str = "push_register";

/// Default API origin.
pub const DEFAULT_API_BASE: &str = "https://evonext.app/v1";

/// Outcome reported back to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterOutcome {
    /// The device token this installation registered.
    pub device_token: String,
    /// Whether the server accepted the registration.
    pub registered: bool,
    /// Human-readable detail (error text on failure).
    pub detail: String,
}

/// Seconds since the Unix epoch.
fn now_secs() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

/// Load the persisted device token, minting and saving one if absent.
///
/// The token MUST be stable across launches. Regenerating it per launch would
/// insert a new `push_devices` row every time and fan out duplicate
/// notifications to the same machine.
pub fn load_or_create_device_identity<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<DeviceIdentity, String> {
    let store = StoreManager::new(app);

    if let Ok(Some(existing)) = store.load::<DeviceIdentity>(DEVICE_STORE_PATH, DEVICE_TOKEN_KEY) {
        if existing.is_valid() {
            return Ok(existing);
        }
        // NOTE: A present-but-unusable stored value (empty token, hand-edited
        //       file) falls through to minting a new one rather than being
        //       sent to the server, which would register every such
        //       installation under the same empty deviceToken.
    }

    let identity = DeviceIdentity::from_token(super::device::new_device_token());

    store
        .save(DEVICE_STORE_PATH, DEVICE_TOKEN_KEY, &identity)
        .map_err(|e| format!("could not persist device token: {e}"))?;

    Ok(identity)
}

/// Build the signed registration payload.
///
/// Split out from the network call so the byte-exact canonical message can be
/// asserted in a unit test without an HTTP server.
pub fn build_registration_payload(
    identity_id: &str,
    device_token: &str,
    wif: &str,
    timestamp: i64,
) -> Result<serde_json::Value, String> {
    let private_key = decode_wif(wif).map_err(|e| format!("invalid WIF: {e}"))?;

    let message =
        build_canonical_message(PUSH_REGISTER_ACTION, identity_id, device_token, timestamp);

    let signature = sign_message_base64(&private_key, &message)
        .map_err(|e| format!("could not sign registration: {e}"))?;

    Ok(serde_json::json!({
        "identityId": identity_id,
        "deviceToken": device_token,
        "platform": PLATFORM_DESKTOP,
        "timestamp": timestamp,
        "signature": signature,
    }))
}

/// Register this installation with the notification fan-out.
///
/// Never returns an error: the frontend calls this opportunistically on
/// connect, and a failure must not block the connection flow. The outcome
/// records what happened.
#[tauri::command]
pub async fn register_realtime_device<R: Runtime>(
    app: AppHandle<R>,
    identity_id: String,
    wif: String,
) -> Result<RegisterOutcome, String> {
    /* Load (or mint) the stable device token. */
    let identity = match load_or_create_device_identity(&app) {
        Ok(i) => i,
        Err(e) => {
            return Ok(RegisterOutcome {
                device_token: String::new(),
                registered: false,
                detail: e,
            })
        }
    };

    let device_token = identity.device_token.clone();

    /* Build the signed payload. */
    let body = match build_registration_payload(&identity_id, &device_token, &wif, now_secs()) {
        Ok(b) => b,
        Err(e) => {
            return Ok(RegisterOutcome {
                device_token,
                registered: false,
                detail: e,
            })
        }
    };

    /* POST it. */
    let url = format!("{DEFAULT_API_BASE}/push/register");

    let client = match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
    {
        Ok(c) => c,
        Err(e) => {
            return Ok(RegisterOutcome {
                device_token,
                registered: false,
                detail: format!("http client: {e}"),
            })
        }
    };

    let response = client.post(&url).json(&body).send().await;

    match response {
        Ok(resp) => {
            let status = resp.status();

            if status.is_success() {
                // NOTE: The API returns `{ success: bool }`. Treat a 2xx with
                //       `success: false` as a failure — it means the row was
                //       not written even though the request was well-formed.
                let parsed: serde_json::Value = resp.json().await.unwrap_or(serde_json::json!({}));

                let ok = parsed
                    .get("success")
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);

                return Ok(RegisterOutcome {
                    device_token,
                    registered: ok,
                    detail: if ok {
                        "registered".to_string()
                    } else {
                        "server reported success:false".to_string()
                    },
                });
            }

            Ok(RegisterOutcome {
                device_token,
                registered: false,
                detail: format!("http {status}"),
            })
        }
        Err(e) => Ok(RegisterOutcome {
            device_token,
            registered: false,
            detail: format!("request failed: {e}"),
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::crypto::signed_message::dash_message_hash;

    ///
    /// Build a canonical mainnet WIF (0x80 || key || 0x01) for a fixed key.
    ///
    /// Generated rather than hardcoded: the encoded form embeds a checksum
    /// over the key material, so a hand-written string is easy to get wrong.
    ///
    /// NOTE: This fixture is MAINNET (0x80). `decode_wif` also accepts the
    ///       testnet byte (0xef); see `test_wif_testnet()` and the regression
    ///       tests in `crypto/signed_message/tests.rs`.
    fn test_wif() -> String {
        let key_bytes = [1u8; 32];
        use bitcoin::base58;

        let mut payload = vec![0x80u8];
        payload.extend_from_slice(&key_bytes);
        payload.push(0x01);

        base58::encode_check(&payload)
    }

    ///
    /// Build a canonical TESTNET WIF (0xef || key || 0x01) for a fixed key.
    ///
    /// This is the shape the app actually stores on the default network.
    fn test_wif_testnet() -> String {
        let key_bytes = [1u8; 32];
        use bitcoin::base58;

        let mut payload = vec![0xefu8];
        payload.extend_from_slice(&key_bytes);
        payload.push(0x01);

        base58::encode_check(&payload)
    }

    const TEST_IDENTITY: &str = "ADtgYG2MHikwv4UiZeY8faUsEkH1YDjEnJFhGbuXLfFB";

    #[test]
    fn canonical_message_matches_the_server_layout() {
        // The server's buildCanonicalMessage() emits exactly these four lines.
        let message = build_canonical_message(
            PUSH_REGISTER_ACTION,
            TEST_IDENTITY,
            "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
            1789835811,
        );

        let lines: Vec<&str> = message.split('\n').collect();
        assert_eq!(lines.len(), 4);
        assert_eq!(lines[0], "action:push_register");
        assert_eq!(lines[1], format!("identityId:{TEST_IDENTITY}"));
        assert_eq!(lines[2], "deviceToken:3f2504e0-4f89-41d3-9a0c-0305e82c3301");
        assert_eq!(lines[3], "timestamp:1789835811");
    }

    #[test]
    fn payload_uses_the_desktop_platform_label() {
        let payload =
            build_registration_payload(TEST_IDENTITY, "uuid-here", &test_wif(), 1789835811)
                .unwrap();

        // `platform` is z.string() server-side (src/types.ts), not an enum, so
        // "desktop" is accepted without an API change.
        assert_eq!(payload["platform"], "desktop");
    }

    #[test]
    fn payload_carries_every_field_the_endpoint_requires() {
        let payload =
            build_registration_payload(TEST_IDENTITY, "uuid-here", &test_wif(), 1789835811)
                .unwrap();

        // Mirrors PushDeviceRegister in evonext-api/src/types.ts: all five
        // fields are `required: true`.
        for field in [
            "identityId",
            "deviceToken",
            "platform",
            "timestamp",
            "signature",
        ] {
            assert!(
                payload.get(field).is_some(),
                "missing required field: {field}"
            );
        }
    }

    #[test]
    fn signature_verifies_against_the_canonical_message() {
        let timestamp = 1789835811;
        let payload =
            build_registration_payload(TEST_IDENTITY, "uuid-here", &test_wif(), timestamp).unwrap();

        let signature_b64 = payload["signature"].as_str().unwrap();

        // Decode the base64 signature the server will receive.
        use base64::Engine;
        let sig_bytes = base64::engine::general_purpose::STANDARD
            .decode(signature_b64)
            .unwrap();

        assert_eq!(sig_bytes.len(), 65);

        let mut sig = [0u8; 65];
        sig.copy_from_slice(&sig_bytes);

        // Recompute the hash the signer used.
        let message =
            build_canonical_message(PUSH_REGISTER_ACTION, TEST_IDENTITY, "uuid-here", timestamp);
        let hash = dash_message_hash(&message).unwrap();

        // Derive the public key from the same private key.
        let private_key = decode_wif(&test_wif()).unwrap();
        let public_key = public_key_for(&private_key);

        // NOTE: `verify_hash` returns Result<(), _> — Ok(()) means the
        //       signature is valid.
        assert!(
            crate::crypto::signed_message::verify_hash(&hash, &sig, &public_key).is_ok(),
            "signature must verify against the canonical message"
        );
    }

    /// Derive the SEC1-compressed public key for a private key.
    fn public_key_for(_private_key: &[u8; 32]) -> Vec<u8> {
        use k256::ecdsa::SigningKey;
        let sk = SigningKey::from_bytes(_private_key.into()).expect("valid key");
        sk.verifying_key()
            .to_encoded_point(true)
            .as_bytes()
            .to_vec()
    }

    #[test]
    fn registration_action_differs_from_the_socket_action() {
        // A captured push signature must not be replayable as a socket
        // handshake. They share the verification code path server-side, so the
        // action string is what separates them.
        let push = build_canonical_message(PUSH_REGISTER_ACTION, TEST_IDENTITY, "tok", 100);
        let ws =
            crate::crypto::signed_message::build_ws_canonical_message(TEST_IDENTITY, "sess", 100);

        assert_ne!(push, ws);
        assert!(push.starts_with("action:push_register\n"));
        assert!(ws.starts_with("action:ws_connect\n"));
    }

    #[test]
    fn payload_is_rejected_for_a_malformed_wif() {
        let result = build_registration_payload(TEST_IDENTITY, "uuid", "not-a-wif", 100);
        assert!(result.is_err());
    }

    #[test]
    fn payload_accepts_a_testnet_wif() {
        // REGRESSION (2026-09-20): the keystore holds `c...` (0xef) WIFs on
        // the default testnet configuration. Before the decoder fix, this
        // returned Err("invalid WIF: unexpected WIF version byte 0xef") and
        // desktop push registration could never succeed on testnet.
        let payload =
            build_registration_payload(TEST_IDENTITY, "uuid-here", &test_wif_testnet(), 1789835811)
                .expect("testnet WIF must be accepted");

        assert_eq!(payload["platform"], "desktop");
        assert!(payload["signature"].as_str().is_some_and(|s| !s.is_empty()));
    }

    #[test]
    fn testnet_and_mainnet_wifs_produce_identical_payloads() {
        // The network marker must not influence the signature: the same key
        // material is signed, so the payloads are byte-identical apart from
        // nothing at all. Guards against a future refactor that threads the
        // network byte into the hash.
        let mainnet =
            build_registration_payload(TEST_IDENTITY, "uuid-here", &test_wif(), 1789835811)
                .unwrap();
        let testnet =
            build_registration_payload(TEST_IDENTITY, "uuid-here", &test_wif_testnet(), 1789835811)
                .unwrap();

        assert_eq!(mainnet, testnet);
    }

    #[test]
    fn payload_is_rejected_for_a_missing_wif() {
        let result = build_registration_payload(TEST_IDENTITY, "uuid", "", 100);
        assert!(result.is_err());
    }

    #[test]
    fn device_token_is_embedded_verbatim() {
        // If the token were rewritten, the server would store a value the
        // client would never query back and re-register on every launch.
        let token = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
        let payload = build_registration_payload(TEST_IDENTITY, token, &test_wif(), 100).unwrap();
        assert_eq!(payload["deviceToken"], token);
    }

    #[test]
    fn default_api_base_is_versioned() {
        // The push endpoint lives under Hono's basePath('/v1'); the WebSocket
        // route deliberately does not.
        assert_eq!(DEFAULT_API_BASE, "https://evonext.app/v1");
    }
}
