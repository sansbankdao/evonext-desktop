// src-tauri/src/commands/shielded_commands.rs
//
// Shielded (Orchard/Halo2) pool support — Tauri commands for the desktop
// shielded wallet (Phase 1 of the F40–F55 catch-up; see
// docs/HANDOFF-DCG-SDK-AND-SHIELDED.md and the evonext.app records).
//
// The proving service (https://prover.sansbank.dev) answers NO CORS
// preflight, so the webview's fetch dies with net::ERR_FAILED exactly like
// the browser's did (evonext.app F40). The frame therefore travels through
// this command: reqwest POST (raw octet-stream) -> the prover's JSON body
// returned VERBATIM (status + body). No verdict interpretation happens
// here — the TS side (src/lib/shielded/prove.ts postPcztFrame) owns
// retries, error codes and the frame-integrity check, 1:1 with the web.

use serde::{Deserialize, Serialize};
use std::time::Duration;

/// The prover base URL (must match PROVER_BASE_URL in
/// src/lib/shielded/prove.ts).
pub const PROVER_BASE_URL: &str = "https://prover.sansbank.dev";

/// The prover's observed wall time is 60–135s (cold build ~92.8s,
/// evonext.app F51a) — the timeout is a generous ceiling, not a target.
pub const PROVER_TIMEOUT_SECS: u64 = 240;

/// What the TS transport receives: the HTTP status and the prover's JSON
/// body verbatim (200 => { response: hex, meta }; verdicts =>
/// { error, errorCode, detail }).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ProveIpcResult {
    pub status: u16,
    pub body: serde_json::Value,
}

#[tauri::command]
pub async fn shielded_prove_pczt(frame: Vec<u8>) -> Result<ProveIpcResult, String> {
    shielded_prove_pczt_inner(frame).await
}

pub(crate) async fn shielded_prove_pczt_inner(frame: Vec<u8>) -> Result<ProveIpcResult, String> {
    if frame.is_empty() {
        return Err("shielded_prove_pczt: empty PCZT frame".to_string());
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(PROVER_TIMEOUT_SECS))
        .build()
        .map_err(|e| format!("shielded_prove_pczt: client build failed: {e}"))?;

    let response = client
        .post(format!("{PROVER_BASE_URL}/prove/pczt"))
        .header("Content-Type", "application/octet-stream")
        .body(frame)
        .send()
        .await
        .map_err(|e| format!("shielded_prove_pczt: network error: {e}"))?;

    let status = response.status().as_u16();
    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| format!("shielded_prove_pczt: body parse failed (status {status}): {e}"))?;

    Ok(ProveIpcResult { status, body })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_empty_frame_rejected_without_network_call() {
        let result = shielded_prove_pczt_inner(Vec::new()).await;
        assert!(result.is_err());
        let message = result.err().unwrap();
        assert!(message.contains("empty PCZT frame"), "got: {message}");
    }

    /// The URL constant must stay in lockstep with the TS side — a drift
    /// silently routes proofs to the wrong service.
    #[test]
    fn test_prover_url_matches_ts_side() {
        assert_eq!(PROVER_BASE_URL, "https://prover.sansbank.dev");
    }

    #[test]
    fn test_timeout_is_generous_enough_for_cold_proving() {
        // Observed cold proves: 92.8s (F51a), typical 60–135s.
        assert!(PROVER_TIMEOUT_SECS >= 180);
    }
}
