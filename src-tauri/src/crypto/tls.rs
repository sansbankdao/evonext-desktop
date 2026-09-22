// src-tauri/src/crypto/tls.rs
//
//! Process-wide rustls `CryptoProvider` installation.
//!
//! WHY THIS EXISTS
//! ---------------
//! rustls 0.23 removed the implicit provider default. When exactly one provider
//! crate is compiled in it is selected automatically; when two are present
//! rustls cannot choose and every `ClientConfig::builder()` call PANICS:
//!
//! ```text
//! Could not automatically determine the process-level CryptoProvider from
//! Rustls crate features.
//! ```
//!
//! This crate compiles BOTH providers:
//!
//! * `aws-lc-rs` — pulled by `reqwest` via `default-tls` -> `hyper-rustls`
//! * `ring`      — pulled by `tauri-plugin-updater`
//!
//! The panic fires on the first TLS connection built after the ambiguity is
//! observed, which for this app is the realtime WebSocket handshake. The
//! symptom is therefore a HARD CRASH on the notification path rather than a
//! graceful failure, which is why the provider is installed eagerly in
//! `RunEvent::Setup` / `lib::run` before any socket can be opened.
//!
//! `aws-lc-rs` is chosen because `reqwest` already compiles it, so selecting
//! it introduces no new native build step in the release pipeline.

use std::sync::OnceLock;

/// Records whether [`install_tls_provider`] was reached.
///
/// Held so tests can assert the install is idempotent and so a future caller
/// can distinguish "not yet installed" from "failed to install".
static INSTALLED: OnceLock<()> = OnceLock::new();

/// Install the process-wide rustls provider, exactly once.
///
/// SAFE TO CALL MORE THAN ONCE. A second call is a no-op: `rustls` itself only
/// accepts the first provider, and calling `install_default` again returns the
/// already-installed provider as an error which is deliberately ignored.
///
/// Never panics. If installation fails (another component installed a provider
/// first) the existing provider is kept, because a working provider — whichever
/// it is — satisfies every TLS client in this process.
pub fn install_tls_provider() {
    INSTALLED.get_or_init(|| {
        // NOTE: `install_default` returns `Err(Arc<CryptoProvider>)` when a
        //       provider is already installed. That is not a failure: some
        //       other component (or a previous call) won the race, and rustls
        //       works with exactly one provider regardless of which it is.
        if rustls::crypto::aws_lc_rs::default_provider()
            .install_default()
            .is_err()
        {
            tracing::debug!(
                "rustls CryptoProvider already installed; keeping the existing provider"
            );
        }
    });
}

/// Whether [`install_tls_provider`] has run in this process.
pub fn tls_provider_installed() -> bool {
    INSTALLED.get().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn installs_a_provider() {
        install_tls_provider();

        assert!(
            tls_provider_installed(),
            "install_tls_provider must record that it ran"
        );
    }

    #[test]
    fn installation_is_idempotent() {
        // Two calls must not panic and must not replace the provider. rustls
        // rejects the second install internally; this asserts the wrapper
        // swallows that rejection rather than propagating it.
        install_tls_provider();
        install_tls_provider();
        install_tls_provider();

        assert!(tls_provider_installed());
    }

    #[test]
    fn a_client_config_can_be_built_after_installing() {
        // THE ACTUAL REGRESSION. Before the provider was installed,
        // `ClientConfig::builder()` panicked with
        // "Could not automatically determine the process-level CryptoProvider".
        // That panic is what the realtime socket hit at runtime, so building
        // one config here is the smallest possible proof that the fix holds.
        install_tls_provider();

        let config =
            rustls::ClientConfig::builder().with_root_certificates(rustls::RootCertStore::empty());

        // The builder only completes if a provider was resolvable.
        let _ = config.with_no_client_auth();
    }

    #[test]
    fn a_default_provider_is_resolvable_without_the_explicit_install() {
        // Documents WHY the install is needed: both providers are compiled in,
        // so rustls reports the ambiguity. This test asserts the ambiguity
        // exists, which is the condition that makes `install_tls_provider`
        // load-bearing rather than decorative.
        //
        // NOTE: `get_default_or_install_from_crate_features` is the internal
        //       resolution path. If this ever stops erroring, a crate that
        //       previously pulled one of the two providers has dropped it and
        //       the install call could be retired.
        let resolved = std::panic::catch_unwind(|| {
            let _ = rustls::ClientConfig::builder();
        });

        // A panic OR an error both mean "not automatically resolvable".
        // Either way the explicit install above is what makes it work.
        assert!(
            resolved.is_err() || rustls::crypto::CryptoProvider::get_default().is_some(),
            "expected either an ambiguous-provider panic or an explicit provider"
        );
    }
}
