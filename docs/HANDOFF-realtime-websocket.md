# HANDOFF — Realtime WebSocket Notifications (Desktop)

Status: **deployed and verified end-to-end against production.**
`GET wss://evonext.app/ws/connect` reaches `101 Switching Protocols`, and
`GET https://evonext.app/ws/stats` reports `{"identities":1,"sockets":1}` while
the desktop socket is held open. The server-side deploy that unblocked this is
`e85f5dfd-9b25-4d05-8e4c-f3bbae76eeb3` on `evonext-api` (`f45efe4`).

The one remaining infrastructure action is the release-build flag documented
under "Required owner actions" below.

## Why WebSocket and not Pushy

Pushy was investigated and is **impossible for this desktop app**:

- `pushy-electron` requires a Node/Electron runtime. Tauri ships none.
- The Pushy App IDs (`app.evonext` / `evonext.app`) are **Web Push** apps. A
  live probe against the Pushy API confirmed `platform=web` is accepted while
  `linux` / `windows-64` return *"The device platform is missing or invalid"*.
- Web Push requires `window.PushManager`. A probe inside a real Tauri webview
  (WebKitGTK 2.52.6) reported `navigator.serviceWorker=true`,
  `crypto.subtle=true`, `Notification=true`, and **`window.PushManager=undefined`**.
  Without it, no subscription can be minted, so the `web` path is closed too.

All Pushy code was therefore **removed** from the desktop repo. Pushy remains in
use for **mobile**, which is unaffected.

`src-tauri/src/crypto/signed_message.rs` was **kept** — it is the general Dash
Signed Message primitive (also used for push registration), not Pushy-specific,
and the WebSocket handshake depends on it.

## Architecture

```
desktop (Rust)  ──wss://evonext.app/ws/connect──>  evonext-api worker  ──>  NotifyHub DO
                                                                              │
                                            single global object, idFromName('global')
                                            in-storage index: identityId -> [socket tags]
                                            (one JSON object; get/put, not SQL)
```

Design choices, and why:

- **One global Durable Object** (`Option B`). The pre-existing fan-out was
  already global, so this is strictly more capable: the object *can* filter by
  identity, which a per-worker broadcast cannot.
- **WebSocket Hibernation API** (`ctx.acceptWebSocket()` plus the
  `webSocketMessage` / `webSocketClose` / `webSocketError` handlers). The object
  is evicted from memory between events, and idle sockets are **serialised and
  survive the eviction**.
- **No alarms, no outbound connections.** The object wakes only on inbound
  events. There is no `setAlarm()` call site.

> **Correction.** An earlier revision of this section said the *standard*
> (non-hibernating) API was used. That was wrong — the deployed server uses
> hibernation, and the server-side header comment in
> `evonext-api/src/durable/NotifyHub.ts` has been corrected too. The
> distinction inverts eviction behaviour: with hibernation an idle socket
> **survives** eviction; with the standard API it would be dropped. See the
> API-side handoff, `evonext-api/docs/HANDOFF-realtime-websocket.md` §4.1.

### Reconnect is still implemented, and still worth keeping

Because the socket survives eviction, reconnect is no longer *load-bearing* —
but it remains a correctness requirement for the cases hibernation does not
cover: a network drop, `MAX_SOCKETS_PER_IDENTITY` eviction, and a worker
redeploy. If reconnect breaks, notifications stop silently with no error
surface, so all three mechanisms below stay:

1. `src-tauri/src/realtime/backoff.rs` — exponential backoff, capped at 60s,
   with jitter to avoid a thundering herd when a whole cohort reconnects at once.
2. The identity index is pruned on `webSocketClose` **and** `webSocketError`
   (Cloudflare calls the latter *instead of* the former for errored sockets).
   The index is one JSON object written via `storage.get`/`storage.put`; no SQL
   is involved, though the DO's storage *engine* is SQLite-backed (required by
   hibernation).
3. A 30s client heartbeat, so a dead socket is noticed in under a minute rather
   than at the next notification (which could be hours).

## Authentication

Reuses the existing Dash Signed Message scheme. A **separate** action name,
`ws_connect`, is used rather than overloading push's `deviceToken` field:

```
action:ws_connect
identityId:<id>
sessionId:<sid>
timestamp:<ts>
```

Server-side (`evonext-api/src/libs/wsAuth.ts`) mirrors
`verifySignature.ts` exactly, including:

- the literal `0x19` (25) prefix byte — **not** `"Dash Signed Message:\n".len()`
  (21). Computing it from the string length silently breaks verification. This
  is pinned by a guard test on both sides.
- a 300s replay window (`MAX_SIGNATURE_AGE_SECONDS`).
- a 255-byte ceiling, because the prefix encodes the length in a single byte.

The Rust and TypeScript builders are verified **byte-identical** against a
shared, independently-generated vector (146 bytes, hash `ab99b570…`).

## Files

### evonext-desktop

| Path | Purpose |
| --- | --- |
| `src-tauri/src/realtime/mod.rs` | Module root; Tauri event names |
| `src-tauri/src/realtime/protocol.rs` | Wire types, handshake query builder, percent-encoding |
| `src-tauri/src/realtime/backoff.rs` | Reconnect policy (pure, fully unit-tested) |
| `src-tauri/src/realtime/client.rs` | Connect/serve/heartbeat/reconnect loop (`realtime` feature) |
| `src-tauri/src/crypto/signed_message.rs` | `ws_connect` action + `build_ws_canonical_message` |

The whole socket stack is behind the **`realtime` Cargo feature, OFF by
default**. A plain `cargo build` compiles no socket code and needs no new
network dependencies.

### evonext-api

| Path | Purpose |
| --- | --- |
| `src/durable/NotifyHub.ts` | The Durable Object (index, fan-out, pruning) |
| `src/libs/wsAuth.ts` | Handshake verification (mirrors `verifySignature.ts`) |
| `src/ws.ts` | `GET /ws` upgrade, `POST /ws/publish`, `GET /ws/stats` |
| `wrangler.jsonc` | Routes `evonext.app/ws` + `/ws/*`, DO binding, SQLite-engine migration tag (`new_sqlite_classes`, required by hibernation) |

`/ws` bypasses the Hono `basePath('/v1')`: notification transport is unversioned.

### evonext-manager

| Path | Purpose |
| --- | --- |
| `src/sendWs.js` | Publishes to `/ws/publish`; fails closed without a secret |
| `src/manageYapprPosts.js` | Fan-out for Yappr posts (additive to Pushy) |
| `src/managePush.js` | Fan-out for registrar-ready (already identity-scoped) |

## Corrections to earlier notes

Two claims made during planning were **wrong** and are corrected here:

1. *"The manager broadcasts to all devices, ignoring `identityId`."*
   False for `managePush.js`, which has always bound `identityId` in its device
   query. Only `manageYapprPosts.js` performs a global
   `SELECT DISTINCT deviceToken FROM push_devices`. The manager change is
   therefore **not** a prerequisite for the socket infrastructure; it is a
   separate, additive fan-out.

2. *"The manager change was required to make filtering possible."*
   Not so. Filtering happens in the Durable Object. The manager only supplies
   the candidate identity list.

## Desktop-only identities ARE discoverable (earlier note corrected)

An earlier revision of this document claimed a desktop-only identity could not
have a row in `push_devices`, and that closing the gap needed a new table.
**Both claims were false.** They are corrected here rather than deleted, so the
earlier reasoning is not silently lost.

What the schema actually says (`evonext-api/migrations/0001_push_devices.sql`):

```sql
CREATE TABLE IF NOT EXISTS push_devices (
    identityId TEXT NOT NULL,
    deviceToken TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL,
    ...
    PRIMARY KEY (identityId, deviceToken)
);
```

The `UNIQUE` constraint is on `deviceToken`, not on `identityId`. So a desktop
identity simply registers a device token of its own. The desktop client does
exactly this: `src-tauri/src/realtime/register.rs` posts to `/v1/push/register`
with `platform = "desktop"` and a **randomly-generated, persisted UUID** as the
device token (`device.rs`, `PLATFORM_DESKTOP`). `platform` is a free-form
string in the API schema, so no schema change was needed.

The fan-out query on the manager side asks only for non-null identities:

```sql
SELECT DISTINCT identityId FROM push_devices WHERE identityId IS NOT NULL
```

(`evonext-manager/src/manageYapprPosts.js:148-156`) — it does **not** require a
mobile token. A desktop row is therefore discoverable.

**Verified live:** registering the testnet identity
`34vkjdeUTP2z798SiXqoB6EAuobh51kXYURqVa9xkujf` returned
`200 {"success":true}` against production, and the socket then appeared in
`/ws/stats`. The guard test
`publishes a WebSocket event even when NO push device is registered`
(`evonext-manager/tests/yapprPush.test.js`) still pins the ordering rule that
the WS fan-out runs even when the push-device list is empty.

## Required owner actions before this works in production

Items 2-4 and 6 below are **done**. Item 1 remains an open design question and
item 5 is now fixed in the workflow file but has not yet shipped in a release.

1. **`WS_PUBLISH_SECRET` remains a shared symmetric secret** on
   `POST /ws/publish`. Its value is write-only (`wrangler secret list` reports
   `secret_text`), so it cannot be read back or audited, cannot be rotated
   without a coordinated redeploy of both workers, and grants any holder the
   ability to forge arbitrary notifications to any identity. Recommend
   replacing it with a signed publish request using the existing
   `identitySignature.ts` machinery, so the verifier holds a public key. That
   is an `evonext-api` + `evonext-manager` decision.
2. ~~Deploy `evonext-api` (adds the DO migration + routes).~~ **Done** —
   `e85f5dfd-9b25-4d05-8e4c-f3bbae76eeb3` (source `f45efe4`).
3. ~~Deploy `evonext-manager` (adds the fan-out calls).~~ **Done** —
   `src/sendWs.js` posts the `x-evonext-publish-secret` header.
4. ~~Decide on the desktop identity-registry question above.~~ **No decision
   needed** — desktop identities register through the existing `push_devices`
   table; see the corrected section above.
5. **Enable the `realtime` Cargo feature in the release build.** The feature is
   OFF by default (`src-tauri/Cargo.toml`: `realtime = ["dep:tokio-tungstenite"]`,
   with no `default` list). A build without it compiles the socket out, and
   `connect_realtime` returns *"this build was compiled without the `realtime`
   feature"* at runtime. `.github/workflows/release.yml` now passes
   `--features realtime` on all three platform builds, but **no release has been
   cut with that change yet**.
6. ~~Add `tauri-plugin-notification` and surface the events in the UI.~~
   **Done** — `tauri-plugin-notification` 2.4.0 is initialised
   (`src-tauri/src/lib.rs:63`), the `notification:*` capabilities are granted
   (`src-tauri/capabilities/main.json:35-38`), and the UI path
   (`src/composables/useRealtimeToast.ts`, `showOsNotification` in
   `useRealtime.ts`) is implemented and tested.

## What is still NOT proven

The full fan-out has not been observed end-to-end. Two prerequisites are
individually proven against production — a discoverable `push_devices` row
(`200 {"success":true}`) and a live socket (`101` plus
`{"identities":1,"sockets":1}`) — but no published event has been watched
arriving in a running desktop client. Completing that needs either a real post
through the Yappr cron or a direct `POST /ws/publish`, which requires the
shared secret in item 1.

## Verification status

Everything below was run and observed locally.

| Suite | Result |
| --- | --- |
| Rust `cargo test --lib` (default) | 930 passed / 0 failed / 5 ignored |
| Rust `cargo test --lib --features realtime` | 930 passed / 0 failed / 5 ignored |
| Rust `cargo test --lib -- --test-threads=1` | 930 passed / 0 failed |
| `check.sh` (all 3 steps) | exit 0 |
| `cargo clippy` (both feature configs) | 0 errors |
| `cargo fmt --check` | clean |
| Frontend `pnpm test` | 71 files / 639 tests passed |
| `vue-tsc --noEmit` | exit 0 |
| `evonext-api` vitest | 72 passed (6 files) |
| `evonext-manager` vitest | 16 passed (2 files) |

Mutation-proven guards (deliberately reintroducing the bug makes a test fail):

- NotifyHub monotonic socket tags — reverting to
  `getWebSockets().length` fails `never reuses a tag across a
  connect/close/connect cycle` with `expected 1 not to be 1`.
- The `0x19` prefix constant (Rust) and the 146-byte cross-language vector.

### Test-infrastructure defect found and fixed

`test_settings_full_lifecycle` and `test_settings_command_wrapper_generic`
both read and write `settings.json` in the **same real app-data directory**
(the mock Tauri app resolves to it). Under the default parallel test runner
they raced, and `test_settings_full_lifecycle` failed at its
`assert(empty.is_none())` line. Both are now marked `#[serial]`.

This is a pre-existing latent bug that the 46 new realtime tests exposed by
changing thread scheduling. It was **not** caused by the realtime code, but the
tree is not left in a state where it reproduces.

### Not covered by tests

- No end-to-end socket test in CI: nothing in CI opens a real WebSocket
  against a deployed worker. The DO is tested through `runInDurableObject`
  against miniflare, which exercises the real object but not the
  `evonext.app` route.
- The live proof of `101` / `/ws/stats` / `/v1/push/register` was run manually
  against production with an `#[ignore]`d test suite
  (`src-tauri/src/realtime/live_tests.rs`). It is not part of `check.sh` and
  will not run unattended.
- The Rust client's connect loop is not integration-tested (no server in CI).
  Its pure logic — backoff, protocol parsing, handshake query building — is.
