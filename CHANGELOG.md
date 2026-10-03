# Changelog

## v26.10.1

### New Features

- __Deep links:__ The app now *receives* `dash:` payment URIs in addition to
  generating them — clicking a `dash:` payment link (from a website, QR
  scanner, or another app) opens the Send screen with the recipient and
  amount pre-filled. Link handling is registered at runtime so it works
  from the desktop entry without a re-install.
- __Crash reporting:__ Optional Sentry integration with a compile-time DSN.
  TLS is rustls-only (no OpenSSL dependency), panics are captured and
  reported, and memory minidumps are deliberately disabled so wallet
  material never leaves the device.

### Improvements

- __Code quality:__ All Clippy warnings cleared; the codebase is clean
  under `-D warnings`.
- __Build reproducibility:__ The Rust toolchain is pinned (1.98.1) so
  local builds, CI, and release builds all compile with the same compiler.
- __CI:__ Added `ci-mirror.sh`, which runs every CI gate locally — useful
  while GitHub-hosted runners are unavailable.
- __Testing:__ Fixed the stale end-to-end scaffold so the E2E gate runs
  green under xvfb.

---

## Archived (pre-numbered entries)

Introducing the newest version of the EvoNext Desktop Edition

### Introducing the 7th Release Candidate (Full Coverage)

This latest version of EvoNext introduces a FULL Coverage testing suite.

## Latest Features:

- __Testing:__ Both the front-end and back-end testing suite are not BOTH above 80%.

## Bugfixes:

- __Testing:__ Added new tests and re-configured settings to support a MINIMUM of 80% testing coverage.

## Notes:

We would especially like to thank all the contributors that made this release possible:
- 0xShomari
