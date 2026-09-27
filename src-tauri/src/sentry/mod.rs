// src-tauri/src/sentry/mod.rs
//
//! Error reporting via Sentry, self-hosted-capable and rustls-only.
//!
//! WHY THIS EXISTS
//! ---------------
//! `sentry = "0.46.1"` and `tauri-plugin-sentry = "0.5"` were declared in
//! `Cargo.toml` for two years without a single reference anywhere in
//! `src-tauri/src/`. Nothing was ever reported because nothing was ever
//! initialised. The pair was ALSO uncompilable: plugin 0.5 pins
//! `sentry ^0.42`, so `sentry::init()` yielded a 0.46 `ClientInitGuard` while
//! the plugin demanded a `&sentry_core::client::Client` from the *0.42* crate
//! — two distinct types from two distinct crates:
//!
//! ```text
//! error[E0308]: mismatched types
//!   expected `&Client`, found `&ClientInitGuard`
//! ```
//!
//! Both sides are therefore pinned forward together: `sentry 0.49` +
//! `tauri-plugin-sentry 0.6`. That pairing collapses the duplicate sentry
//! crates to one and — see TLS below — REMOVES an existing violation.
//!
//! TLS
//! ---
//! This is not merely a tidy-up. The old `sentry 0.46` was pulled with its
//! default features, whose `transport` feature enables `native-tls`:
//!
//! ```text
//! openssl-sys <- native-tls <- hyper-tls <- reqwest 0.12 <- sentry 0.46.2
//! ```
//!
//! That chain compiled OpenSSL into the release pipeline, contradicting the
//! rustls-only rule documented in `Cargo.toml` (which exists so Linux builds
//! inside `evobuild:22.04` and Windows cross-builds via cargo-xwin do not
//! depend on a per-machine OpenSSL). Sentry is now built with
//! `default-features = false` and the `rustls` feature, which drops
//! `native-tls` and `openssl-sys` from the dependency graph entirely.
//!
//! TWO SEPARATE SDKs, ONE EVENT STREAM
//! -----------------------------------
//! * The RUST SDK is created here and owns the real DSN and the transport.
//! * The BROWSER SDK is injected into the webview by the plugin as
//!   `dist/inject.min.js`, a self-contained bundle that is initialised with a
//!   DUMMY DSN (`https://123456@dummy.dsn/0`) and the plugin's custom
//!   transport/beforeBreadcrumb hooks. Browser events and breadcrumbs are
//!   passed over Tauri IPC to `commands::envelope` / `commands::breadcrumb`
//!   and sent by the Rust client, so the real DSN never enters the webview
//!   bundle and both sides share one app/device context and one breadcrumb
//!   timeline. The webview needs `sentry:default` in its capability for that
//!   IPC to be permitted; without it the hooks fail and the browser SDK
//!   silently stops reporting.
//!
//! MINIDUMP IS DELIBERATELY OFF
//! ----------------------------
//! `tauri-plugin-sentry`'s default feature is `minidump`, which spawns a
//! crash-reporter child process to capture native segfaults. It is DISABLED
//! here for two independent reasons:
//!
//!   1. It does not resolve. `sentry-rust-minidump 0.17` -> `minidumper 0.10`
//!      -> `minidump-writer 0.12` -> `error-graph`, which is not on crates.io
//!      (`no matching package named 'error-graph' found`). The build cannot
//!      complete with the feature enabled.
//!   2. It is unsafe for this app's threat model. `vault/mod.rs` documents
//!      the keystore as "In-memory ... a plain buffer", so the user's
//!      MNEMONIC and private keys are resident in addressable memory. What
//!      memory regions a minidump captures by default has NOT been verified
//!      here, and AGENTS.md requires that sensitive material never be
//!      logged or exported. Panics, JS errors and breadcrumbs are reported
//!      without minidump; only native memory-fault crashes are lost. Do not
//!      enable the feature without first proving what a dump contains.
//!
//! NO DSN => NO REPORTING, AND THAT IS NOT A FAILURE
//! -------------------------------------------------
//! The DSN comes from `option_env!("SENTRY_DSN")`, a COMPILE-TIME variable, so
//! it is never committed and never enters the repo. When it is absent (every
//! local `pnpm tauri dev` and any build without the variable exported) this
//! module returns a guard that is NOT initialised rather than one bound to a
//! placeholder DSN: a placeholder would make the SDK accept and then silently
//! drop every event, which looks identical to "no crashes" and is the worst
//! possible failure mode for an error reporter.

use std::sync::OnceLock;

use tauri::Runtime;

/// Normalise a raw `SENTRY_DSN` value into a usable DSN, or `None`.
///
/// Extracted from [`dsn`] so the empty/whitespace behaviour can be tested
/// directly: an inline `.filter(...)` could not be mutated into a failing
/// test, which is how the first version of this module's test ended up
/// vacuous.
///
/// `Option<&str>` is taken rather than `&str` because the caller's input is
/// `option_env!`, which is `Option`-shaped when the variable is unset.
pub fn normalise_dsn(raw: Option<&str>) -> Option<&str> {
    raw.map(str::trim).filter(|dsn| !dsn.is_empty())
}

/// The compile-time DSN, or `None` when `SENTRY_DSN` was not set.
///
/// `option_env!` (not `env!`) is the point: the variable is absent in ordinary
/// development, and a missing DSN must degrade to "no reporting", never to a
/// build failure.
pub fn dsn() -> Option<&'static str> {
    normalise_dsn(option_env!("SENTRY_DSN"))
}

/// Whether error reporting can run in this build.
///
/// False when no DSN was compiled in. Callers use this to decide whether to
/// attach a plugin at all.
pub fn is_enabled() -> bool {
    dsn().is_some()
}

/// Records the client created by [`init`], mirroring `crypto::tls`.
static CLIENT: OnceLock<sentry::ClientInitGuard> = OnceLock::new();

/// Build the Sentry client and return the guard that keeps it alive.
///
/// Returns `None` when no DSN is compiled in. The guard MUST be held for the
/// lifetime of the process: dropping it flushes and shuts the client down, so
/// every subsequent event would be lost. `create_app` stores it in a `static`.
///
/// `release` is taken from `CARGO_PKG_VERSION`, which matches the version in
/// `tauri.conf.json`/`package.json` — those files are kept in lockstep by the
/// release process, so the reported release identifies the shipped build
/// without extra wiring.
///
/// `auto_session_tracking` is left at its default. The plugin's browser
/// default options filter out Sentry's `BrowserSession` integration precisely
/// so that the RUST side owns the session; enabling it here would double-count
/// sessions.
pub fn init() -> Option<&'static sentry::ClientInitGuard> {
    let dsn = dsn()?;

    let guard = CLIENT.get_or_init(|| {
        // NOTE: `ClientOptions` is `#[non_exhaustive]` in sentry 0.49, so it
        //       cannot be built with a struct expression (E0639).
        //       `ClientOptions::new()` plus setters is the supported way.
        // NOTE: `release` takes `Into<Cow<'static, str>>`, which an
        //       `Option<Cow<...>>` does not satisfy — hence the flatten to a
        //       plain `&'static str` from the crate version rather than
        //       `sentry::release_name!()`. `CARGO_PKG_VERSION` is the same
        //       version kept in lockstep across the four manifests by the
        //       release process, so it identifies the shipped build.
        let options = sentry::ClientOptions::new().release(env!("CARGO_PKG_VERSION"));

        sentry::init((dsn, options))
    });

    Some(guard)
}

/// Attach the Tauri plugin for the initialised client.
///
/// Follows the guard's lifetime: with no DSN there is no client and therefore
/// no plugin, so this returns `None` and the IPC commands
/// (`plugin:sentry|envelope`, `plugin:sentry|breadcrumb`) are never registered.
/// That is correct — with reporting disabled the injected browser SDK has no
/// destination anyway, and leaving the commands out keeps the surface smaller.
pub fn plugin<R: Runtime>() -> Option<tauri::plugin::TauriPlugin<R>> {
    let guard = init()?;
    Some(tauri_plugin_sentry::init(guard))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dsn_when_present_is_a_valid_sentry_dsn() {
        // NOTE: This test originally asserted the DSN was ALWAYS absent, which
        //       is wrong: a release build is SUPPOSED to set SENTRY_DSN, so
        //       that assertion would fail the release pipeline. The real
        //       invariant is conditional — when a DSN is compiled in it must
        //       PARSE, because a malformed DSN is accepted by `sentry::init`
        //       and then silently drops every event.
        //
        // `option_env!` is resolved at compile time, so this tests the tree
        // that was actually built rather than the current environment.
        let Some(raw) = option_env!("SENTRY_DSN") else {
            // The normal development case: no DSN, reporting off. Asserted
            // separately in `init_returns_none_without_a_dsn`.
            return;
        };

        let parsed: sentry::types::Dsn = raw
            .parse()
            .expect("a compiled-in SENTRY_DSN must be a well-formed Sentry DSN");

        // Guards against the placeholder trap: the plugin's browser SDK ships
        // `https://123456@dummy.dsn/0`, which parses fine but sends nowhere.
        // A real DSN must name a host and a project.
        assert!(
            !parsed.host().contains("dummy"),
            "SENTRY_DSN must not be the plugin's placeholder DSN"
        );
        // NOTE: `project_id()` returns `&ProjectId`, not an `Option` — the id
        //       is mandatory in a well-formed DSN (the parse above already
        //       enforces its presence), so asserting non-emptiness here is
        //       what guards against a bare host with no project.
        assert!(
            !parsed.project_id().to_string().is_empty(),
            "SENTRY_DSN must include a project id"
        );
    }

    #[test]
    fn is_enabled_follows_the_dsn() {
        // The two accessors must agree; a drift here would make `is_enabled()`
        // claim reporting works while `init()` returns None (or vice versa).
        assert_eq!(is_enabled(), dsn().is_some());
    }

    #[test]
    fn init_returns_none_without_a_dsn() {
        // THE DEGRADATION CONTRACT. Without a DSN this must return None rather
        // than a guard bound to a placeholder DSN: a placeholder SDK accepts
        // events and silently drops them, which is indistinguishable from a
        // crash-free app.
        if dsn().is_none() {
            assert!(init().is_none());
            assert!(plugin::<tauri::Wry>().is_none());
        }
    }

    #[test]
    fn init_is_idempotent_when_a_dsn_exists() {
        // The guard lives in a `OnceLock`, so repeated calls must hand back
        // the SAME client. Dropping the guard shuts the client down; a second
        // distinct guard would mean one of them is dropped immediately and
        // reporting dies mid-run.
        if dsn().is_some() {
            let first = init().expect("dsn implies a client");
            let second = init().expect("dsn implies a client");
            assert_eq!(first.dsn(), second.dsn());
        }
    }

    #[test]
    fn empty_dsn_is_treated_as_absent() {
        // `.filter(|dsn| !dsn.trim().is_empty())`: an exported-but-empty
        // variable (a common shell accident: `export SENTRY_DSN=`) must NOT
        // produce an initialised client aimed at nothing.
        //
        // NOTE: This test originally asserted on a LOCAL re-implementation of
        //       the filter, which made it vacuous — removing the real filter
        //       did not fail it. It now exercises `normalise_dsn`, the exact
        //       function `dsn()` delegates to, so deleting the filter breaks
        //       this test.
        assert_eq!(normalise_dsn(Some("")), None);
        assert_eq!(normalise_dsn(Some("   ")), None);
        assert_eq!(normalise_dsn(Some("\t\n ")), None);
        assert_eq!(normalise_dsn(None), None);

        // The positive case must survive, or the filter would disable a
        // correctly-configured release build.
        assert_eq!(
            normalise_dsn(Some("https://key@host/1")),
            Some("https://key@host/1")
        );

        // Surrounding whitespace is trimmed rather than rejected, so a DSN
        // pasted with a trailing newline in a CI secret still works.
        assert_eq!(
            normalise_dsn(Some("  https://key@host/1\n")),
            Some("https://key@host/1")
        );
    }

    #[test]
    fn a_real_panic_produces_a_captured_sentry_event() {
        // WHY THIS LIVES IN `--lib` AND NOT `tests/`
        // ----------------------------------------
        // `check.sh` (the gate AGENTS.md mandates) runs ONLY
        // `cargo test --lib`, so a `tests/*.rs` binary would never execute
        // here and would protect nothing. This has to be a unit test.
        //
        // IS IT SAFE IN THE SHARED BINARY? The two globals involved are the
        // panic hook (`sentry_panic::PanicIntegration::setup`, installed via
        // a process-wide `Once`) and the current hub.
        //
        //   * The hub is `thread_local!` (hub_impl.rs:15) and
        //     `Hub::run` returns a `SwitchGuard` that is deliberately `!Send`,
        //     so the test hub is bound to THIS test's thread only. Cargo runs
        //     each test on its own thread, and the panic hook fires on the
        //     panicking thread, so the hook sees this test's client and not a
        //     neighbour's.
        //   * The hook warns on DOUBLE faults but only installs once; that is
        //     fine because this is the only test in the binary that panics on
        //     purpose — there are NO `#[should_panic]` tests in `src/`
        //     (verified: `grep -rn should_panic src/` is empty), and no other
        //     module binds a client.
        //
        // WHAT THIS PROVES. `sentry::init` does not use `sentry::test::*`
        // (that feature is a dev-dependency, absent from release builds), so
        // the production path itself is exercised by the DSN probe above.
        // What is proven HERE, and nowhere else, is the LINK production
        // depends on: that `apply_defaults` installs `PanicIntegration` so a
        // real panic yields an event carrying an exception. Drop the `panic`
        // feature from Cargo.toml and this test fails while every other test
        // still passes — which is the whole point, since reporting crashes is
        // the primary job of an error reporter.

        // `with_captured_events_options` binds a fresh hub with a
        // `TestTransport` for the closure, so nothing is sent over the
        // network and SENTRY_DSN is not needed at build time.
        //
        // NOTE: `sentry::apply_defaults` MUST be called explicitly. The test
        //       helper does NOT call it — it goes straight through
        //       `ClientOptions -> Client::with_options`, which runs
        //       `integration.setup()` only over the integrations ALREADY in
        //       the options. `ClientOptions` starts with an empty integration
        //       list, so omitting this installs no panic hook and the test
        //       captures zero events. Production `sentry::init` calls
        //       `apply_defaults` itself, so this mirrors the real path.
        let options = sentry::apply_defaults(
            sentry::ClientOptions::new().environment("panic-integration-test"),
        );
        let events = sentry::test::with_captured_events_options(
            || {
                // `catch_unwind` so the panic does not abort this test
                // process; the hook still runs before unwinding proceeds.
                let _ = std::panic::catch_unwind(|| {
                    panic!("EVONEXT-PANIC-INTEGRATION-TEST: deliberate panic");
                });
            },
            options,
        );

        assert_eq!(
            events.len(),
            1,
            "a panic must produce exactly one captured event"
        );

        let event = &events[0];

        // An event with no exception is a bare message: it would still be an
        // event but would carry no payload or stacktrace, so this assertion
        // distinguishes a real PanicIntegration from a placeholder emitter.
        assert_eq!(
            event.exception.values.len(),
            1,
            "the event must carry exactly one exception"
        );

        let exception = &event.exception.values[0];

        // `PanicIntegration::event_from_panic_info` sets `ty` to this exact
        // string, proving the event came from the panic integration.
        assert_eq!(
            exception.ty, "panic",
            "exception type must be 'panic' to prove PanicIntegration produced it"
        );

        // The payload must survive, or a crash report would say only that a
        // panic happened with no way to identify it.
        let value = exception
            .value
            .as_deref()
            .expect("the panic message must not be lost");
        assert!(
            value.contains("EVONEXT-PANIC-INTEGRATION-TEST"),
            "the panic payload must be preserved in the event, got: {value}"
        );

        // NOTE: `sentry_panic` sets `Level::Fatal`, NOT `Level::Error`
        //       (sentry-panic-0.49.3/src/lib.rs:131). The first version of
        //       this test asserted `Error` from assumption and failed;
        //       `Fatal` is the verified value. Level drives alerting, so it
        //       must match the integration rather than a guess.
        assert_eq!(
            event.level,
            sentry::Level::Fatal,
            "sentry_panic reports panics as Fatal; a change here changes alerting"
        );
    }
}
