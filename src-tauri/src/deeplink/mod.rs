// src-tauri/src/deeplink/mod.rs
//
//! `dash:` deep-link registration (receive side).
//!
//! WHY THIS EXISTS
//! ---------------
//! The app already EMITS `dash:` payment URIs as QR codes
//! (`src/screens/identity/Register.vue`, `src/screens/Bootstrap.vue`) but had
//! no way to RECEIVE them: clicking a `dash:` link in a browser opened
//! whatever else claimed the scheme, or nothing at all.
//!
//! EvoNext now claims `x-scheme-handler/dash` and registers itself as the
//! DEFAULT handler on Linux (via `xdg-mime default`). That is a deliberate
//! product decision, and it DOES take the scheme from Dash-Qt on machines
//! that have it installed. `dash:` is Dash Core's own payment-URI scheme
//! (`dashpay/dash`, src/qt/bitcoin.cpp: "dash: URIs or payment requests"),
//! so this is intentional namespace sharing, not an accident.
//!
//! WHY WE REGISTER AT RUNTIME
//! --------------------------
//! The Tauri bundler writes `Exec=evonext` with NO `%u` field into the
//! packaged .desktop file, so an install-time association would launch the
//! app but DROP the URL. The plugin's own runtime template writes
//! `Exec="<exe>" %u`, so registering here is what actually makes the URL
//! arrive. `register_all()` also covers users who ran the AppImage without
//! an AppImage launcher having registered it.
//!
//! MULTIPLE INSTANCES
//! ------------------
//! There is intentionally NO single-instance plugin. On Linux and Windows the
//! OS starts a new process with the URL as its only CLI argument; that
//! process reads it through `getCurrent()`. No URL is forwarded to an
//! already-running window.

/// The URI scheme this app handles, without `://`.
///
/// This is the one string that must agree with `plugins.deep-link.desktop.
/// schemes` in `tauri.conf.json`. If the two drift, the plugin's
/// `handle_cli_arguments` refuses to treat the argument as a deep link and
/// the click is silently ignored — no error is surfaced anywhere.
pub const DASH_SCHEME: &str = "dash";

/// Register every scheme declared in `tauri.conf.json` as handled by this app.
///
/// Called from `.setup()`, which runs AFTER Tauri has initialised the plugins
/// (`App::build` -> `manager.initialize_plugins` -> `App::setup`), so the
/// deep-link plugin's managed state is guaranteed to exist.
///
/// Errors are reported and swallowed on purpose: a machine without
/// `xdg-mime`/`update-desktop-database` (or a read-only data dir) must still
/// be able to run the app. Losing OS URL association is a degraded feature,
/// not a fatal condition.
pub fn register_schemes<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    use tauri_plugin_deep_link::DeepLinkExt;

    match app.deep_link().register_all() {
        Ok(()) => {
            tracing::debug!("deep-link: registered scheme(s) for this app");
        }
        Err(err) => {
            tracing::warn!(
                "deep-link: scheme registration failed (OS association unavailable): {err}"
            );
        }
    }
}

/// Read the URL the process was launched with, if any.
///
/// On Windows/Linux a `dash:` click spawns a new process whose only argument
/// is the URL, so this must be checked on every startup rather than only in a
/// listener. Returns the first URL whose scheme matches [`DASH_SCHEME`].
pub fn current_dash_url<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
) -> Option<tauri::Url> {
    use tauri_plugin_deep_link::DeepLinkExt;

    let urls = app.deep_link().get_current().ok().flatten()?;

    urls.into_iter()
        .find(|url| url.scheme() == DASH_SCHEME)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scheme_matches_configuration_literal() {
        // The scheme is duplicated as a literal in tauri.conf.json. This test
        // pins the Rust side so a rename cannot silently stop deep links from
        // being recognised (`handle_cli_arguments` matches on the scheme).
        assert_eq!(DASH_SCHEME, "dash");
    }

    #[test]
    fn scheme_has_no_separator() {
        // The plugin's `register()` expects the protocol WITHOUT `://`.
        // A trailing separator produces `x-scheme-handler/dash://`, which
        // xdg-mime treats as a different, unmatched MIME type.
        assert!(!DASH_SCHEME.contains(':'));
        assert!(!DASH_SCHEME.contains('/'));
    }

    #[test]
    fn configuration_declares_the_dash_scheme() {
        // THE silent-failure mode: if `plugins.deep-link.desktop.schemes` in
        // tauri.conf.json does not contain "dash", the plugin's
        // `handle_cli_arguments` rejects the URL (its comment: "dynamic
        // schemes WON'T be processed"), no error is raised anywhere, and
        // clicking a `dash:` link simply does nothing.
        //
        // Parsed into the SAME type the plugin deserializes:
        // tauri_plugin_deep_link::config::Config.desktop is
        // DesktopProtocol::One(DeepLinkProtocol) | List(Vec<DeepLinkProtocol>),
        // and DeepLinkProtocol is tauri_utils::config::DeepLinkProtocol.
        // `deny_unknown_fields` on that struct means a typo'd key here would
        // ALSO fail — so this pins both the key name and the value.
        use tauri::utils::config::DeepLinkProtocol;

        let raw = include_str!("../../tauri.conf.json");
        let conf: serde_json::Value =
            serde_json::from_str(raw).expect("tauri.conf.json must be valid JSON");

        let desktop = conf
            .get("plugins")
            .and_then(|p| p.get("deep-link"))
            .and_then(|d| d.get("desktop"))
            .expect("plugins.deep-link.desktop must exist in tauri.conf.json");

        // Mirror the plugin's untagged enum: a single object, or a list.
        let protocols: Vec<DeepLinkProtocol> =
            match serde_json::from_value::<DeepLinkProtocol>(desktop.clone()) {
                Ok(one) => vec![one],
                Err(_) => serde_json::from_value(desktop.clone())
                    .expect("desktop must be a DeepLinkProtocol or a list of them"),
            };

        let schemes: Vec<String> = protocols.iter().flat_map(|p| p.schemes.clone()).collect();

        assert!(
            schemes.iter().any(|s| s == DASH_SCHEME),
            "tauri.conf.json must declare the {DASH_SCHEME:?} scheme; found {schemes:?}"
        );
    }

    #[test]
    fn opaque_dash_uris_parse_with_dash_scheme() {
        // The Tauri docs claim desktop deep links require `<scheme>://`, but
        // the plugin matches on `url.scheme()` alone, so Bitcoin/Dash-style
        // opaque URIs (no `//`) are accepted. Verified against the `url`
        // crate: `dash:ADDR` parses with scheme="dash", host="",
        // path="ADDR".
        let plain: tauri::Url = "dash:8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE"
            .parse()
            .expect("opaque dash URI must parse");
        assert_eq!(plain.scheme(), DASH_SCHEME);
        assert_eq!(plain.path(), "8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE");

        let with_amount: tauri::Url =
            "dash:8KbXh4GCKYZQLfFwMKX6zLMVyjMq1K6sGx86KtGE3EmE?amount=0.1"
                .parse()
                .expect("dash URI with query must parse");
        assert_eq!(with_amount.scheme(), DASH_SCHEME);
        assert!(with_amount.query().unwrap_or("").contains("amount=0.1"));
    }
}
