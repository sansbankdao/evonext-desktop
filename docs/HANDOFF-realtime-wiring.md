# HANDOFF — Desktop team: realtime WebSocket is built but not connected

**Date:** 2026-09-20 (sections 0-4 describe the original gap; see the STATUS
  banner below — its fixes are complete)
**Repo:** `evonext-desktop`
**Current release:** `v26.9.16` (commit `19f1237`)

> ## STATUS — the four gaps are CLOSED. Read §C before §1.
>
> The four gaps in §1 were real when written, and are now **fixed in the
> working tree** (see §C.1). This document is kept as the record of the
> original problem and its diagnosis, but its §0-§4 statements about "nothing
> calls it" are **no longer true of the current tree**.
>
> Two statements in this document were wrong at the time of writing and are
> corrected here:
>
> 1. **"The release build already enables the feature (`--features realtime`)"**
>    — FALSE. `src-tauri/Cargo.toml` declares `realtime` with no `default`
>    list, and `.github/workflows/release.yml` did not pass the flag on any of
>    its three platform builds. A shipped binary had the socket compiled out.
>    Fixed in the working tree (release.yml lines 89, 151, 194) but **no
>    release has been cut with that change**.
> 2. **"`realtime::client::run()` is never called" (§1, Gap 1)** — FALSE once
>    §3's fix landed. It is called at
>    `src-tauri/src/realtime/commands.rs:61` via `spawn(super::client::run(...))`,
>    reached from `useRealtime.ts:230` → `invoke('connect_realtime')`. **A
>    downstream team repeated this claim in error because this document
>    presented a closed gap as open.**
>
>    NOTE on the grep itself: the pattern in §1
>    (`client::run\|realtime::client`) DOES match `super::client::run`, because
>    it contains the substring `client::run`. The pattern was not the bug. The
>    bug was tense: §0/§1 said "nothing calls it" after §3 had already fixed
>    it. Do not "fix" the grep pattern; fix the reading order.
>
> **Nothing in §0-§4 is more recent than §C.1-§C.8.** Where they disagree, §C
> wins.

---

## 0. Executive summary

The WebSocket notification system has three parts. Two are complete:

| Part | State |
|---|---|
| Server (`evonext-api` NotifyHub + `evonext-manager` fan-out) | **LIVE in production** |
| Rust client (`src-tauri/src/realtime/`) | **written, 40/40 tests green, compiled into the release build** |
| **Wiring: opening the socket, and calling register** | **MISSING when written — NOW DONE (see §C.1)** |

**Net effect at the time of writing: the desktop app received zero push notifications and opened no WebSocket**, despite every layer beneath it being finished and tested. No error was logged, because no code path ran. **This is no longer the state of the tree** — see §C.1.

The claim that used to follow here — *"the release build already enables the feature (`--features realtime`)"* — was **wrong**. The feature was OFF in every release build. That defect is now fixed in `.github/workflows/release.yml`, but no release has shipped with it.

---

## 1. The three concrete gaps

### Gap 1 — `realtime::client::run()` is never called **[CLOSED — see §C.1]**

> This gap is CLOSED. `commands.rs:61` calls `run` via the **relative** path
> `super::client::run`. The command below was written when the gap was open
> and intends to find callers *outside* `client.rs`; run today it returns
> `src-tauri/src/realtime/commands.rs:61`, i.e. it now proves the fix rather
> than the gap. The pattern is correct — `client::run` matches the relative
> path. Only the heading was stale.

`src-tauri/src/realtime/client.rs:92`

```rust
pub async fn run(app: AppHandle, identity_id: String, wif: String) { ... }
```

Verified: nothing outside `client.rs` references `realtime::client`, and `run` appears in no caller.

```bash
grep -rn "client::run\|realtime::client" src-tauri/src/ \
  | grep -v "^src-tauri/src/realtime/client.rs"
# -> (no output)
```

### Gap 2 — `RealtimeState` is not registered as Tauri managed state **[CLOSED — see §C.1]**

`src-tauri/src/realtime/state.rs:56` defines:

```rust
pub struct RealtimeState { pub handle: Mutex<Option<RealtimeHandle>> }
```

Verified: `RealtimeState` appears **nowhere** outside `client.rs`, and `lib.rs` contains **no `.manage(...)` calls at all**.

```bash
grep -rn "RealtimeState" src-tauri/src/ | grep -v "realtime/client.rs"
# -> (no output)
grep -n "\.manage(" src-tauri/src/lib.rs
# -> (no output)
```

### Gap 3 — no command opens or closes the socket **[CLOSED — see §C.1]**

Only **one** realtime command was registered (`lib.rs:120`):

| Registered | Purpose |
|---|---|
| `realtime::register::register_realtime_device` | registers this device for fan-out (HTTP POST) |

There is **no** `connect_realtime` / `disconnect_realtime`. So the socket is never opened and never closed.

### Gap 4 — the frontend never calls `registerDevice` **[CLOSED — see §C.1]**

`src/composables/useRealtime.ts:169` defines `registerDevice(identityId, wif)`, and it is returned from the composable at `:224`. But the only realtime call site in the app is:

```ts
// src/App.vue:122
await startRealtime()   // attaches Tauri event listeners ONLY
```

`startRealtime` (`useRealtime.ts:186`) attaches listeners for `realtime://notify` and `realtime://status` and requests notification permission. It does **not** register the device and does **not** open a socket.

**Consequence:** even if a notification were somehow emitted, this device is not in the server's fan-out index, so the server would never send it one.

---

## 2. What is already correct (do not rebuild)

Everything below is verified working and tested.

### 2.1 The Rust client

| File | Contents |
|---|---|
| `realtime/backoff.rs` | reconnect backoff |
| `realtime/protocol.rs` | `DEFAULT_HUB_URL = "wss://evonext.app/ws/connect"`, `HEARTBEAT_INTERVAL_SECS = 30`, `HEARTBEAT_TIMEOUT_SECS = 10` |
| `realtime/mod.rs` | event constants `EVENT_NOTIFY = "realtime://notify"`, `EVENT_STATUS = "realtime://status"` |
| `realtime/client.rs` | `run()`, `RealtimeHandle`, `RealtimeState`, `build_authenticated_url()` |
| `realtime/register.rs` | `register_realtime_device` command, `build_registration_payload()` |
| `realtime/device.rs` | stable device identity |
| `realtime/uuid.rs` | UUID minting (deliberately **outside** the feature gate) |

- `client` module is gated: `realtime/mod.rs:28` → `#[cfg(feature = "realtime")]`
- Cargo feature is off by default: `src-tauri/Cargo.toml:100`
- Release build enables it: `~/builds/evonext-desktop-release.sh` lines 49 (Linux) and 76 (Windows)

**40/40 `realtime::` tests pass. 25/25 `crypto::` tests pass.**

### 2.2 The registration payload is already signed and shaped correctly

`register.rs` builds:

```json
{
  "identityId": "...",
  "deviceToken": "<stable UUID>",
  "platform": "desktop",
  "timestamp": <unix>,
  "signature": "<base64 compact>"
}
```

`platform` is validated server-side as `z.string()` (`evonext-api/src/types.ts:127`), so `"desktop"` requires **no** server schema change.

### 2.3 Signing is compatible with the server

Cross-language byte-identity was verified against the shared reference vector:

| | Value |
|---|---|
| Message | `action:ws_connect\nidentityId:ADtgYG2MHikwv4UiZeY8faUsEkH1YDjEnJFhGbuXLfFB\nsessionId:sess-9f3a1c7e-2b44-4d10-9a88-7c5e1f2ab0d3\ntimestamp:1789835811` |
| Bytes | **146** |
| Hash | `ab99b5708e5ecc05ec135f60902262ce5c07227e4f0f4de4e5802a1e6d4e32c8` |

Rust (`crypto/signed_message.rs`) and TypeScript (`identitySignature.ts`) produce **the same 146 bytes and the same hash**.

Key details, all verified:

- `DASH_MESSAGE_PREFIX_LEN: u8 = 0x19` is **hardcoded 25** — it is deliberately *not* `DASH_MESSAGE_MAGIC.len()` (which is 21)
- `sign_hash()` returns 65-byte recoverable `r||s||v` with the recovery id at **byte 64** (`r||s` in bytes 0..64)
- `build_ws_canonical_message(identity_id, session_id, timestamp)` is a **separate** builder from `build_canonical_message(action, identity_id, device_token, timestamp)` — field 3 is `sessionId`, not `deviceToken`
- `MAX_SIGNED_MESSAGE_LEN = 255` is enforced on **both** sides

### 2.4 The notification UI bridge is correct

`useRealtime.ts`:

- imports `isPermissionGranted`, `requestPermission`, `sendNotification` from `@tauri-apps/plugin-notification`
- `ensurePermission()` correctly `await`s `isPermissionGranted()` and `requestPermission()` — both return Promises (`plugin-notification/dist-js/index.d.ts:267`, `:284`)
- `showOsNotification()` calls `sendNotification({ title, body })` (`:303` — synchronous, used correctly)
- `handleNotify()` prepends to `state.recent` (capped at `MAX_RECENT`) then shows the OS notification
- failures are swallowed **deliberately**, so a notification error can never tear down the listener

Plugin registration and capabilities are in place:

| Item | Location |
|---|---|
| Registered | `src-tauri/src/lib.rs:63` → `.plugin(tauri_plugin_notification::init())` |
| Dependency | `src-tauri/Cargo.toml:82` → `tauri-plugin-notification = "2.4.0"` |
| Capabilities | `src-tauri/capabilities/main.json:35-38` → `notification:default`, `-allow-is-permission-granted`, `-allow-request-permission`, `-allow-notify` |

### 2.5 The server is live

Verified against production:

| Probe | Result |
|---|---|
| `GET https://evonext.app/ws/stats` | **200** → `{"success":true,"identities":0,"sockets":0}` |
| `GET https://evonext.app/ws` (no upgrade) | 426 (Upgrade Required) |
| `POST https://evonext.app/ws/publish` (no secret) | 401 |

`identities: 0` and `sockets: 0` are **expected** — they are the direct measurement of this bug.

---

## 3. What the fix requires

Four changes, all in `realtime` + `lib.rs`. **All of it must be `#[cfg(feature = "realtime")]`-gated**, because `pub mod client;` is gated at `mod.rs:28`, and the release build is not the only build config.

### 3.1 `RealtimeHandle` has no constructor

Verified: `impl RealtimeHandle` exposes only `stop()` (`:59`) and `is_stopped()` (`:64`). There is no `new()`. One is needed so a connect command can install a fresh handle.

```rust
impl RealtimeHandle {
    pub fn new() -> Self {
        Self { stop: Arc::new(AtomicBool::new(false)) }
    }
}
```

### 3.2 `client::run()` never installs a handle

`run()` only **reads** `state.handle` (`:128`, `:183`) to check for a stop request. If nothing installs a handle, `guard.as_ref()` is permanently `None` and the stop path is unreachable — the loop would run until the process exits.

The connect command must install the handle **before** spawning `run`.

### 3.3 Two new commands

```rust
#[tauri::command]
pub async fn connect_realtime(app: AppHandle, identity_id: String, wif: String) -> Result<(), String>

#[tauri::command]
pub async fn disconnect_realtime(app: AppHandle) -> Result<(), String>
```

`connect_realtime`:
1. stop any existing handle (idempotent reconnect)
2. install `RealtimeHandle::new()` into `RealtimeState`
3. `tauri::async_runtime::spawn(client::run(app, identity_id, wif))`

`disconnect_realtime`:
1. `handle.stop()` and clear it, so the loop exits and emits `disconnected`

`run()` emits `EVENT_STATUS` via `emit_status(&app, "disconnected")` on clean shutdown, so disconnecting also updates the UI.

### 3.4 `lib.rs` wiring

- add `.manage(RealtimeState::default())` — currently there are **no** `.manage()` calls at all
- add the two commands to the `generate_handler!` list next to `realtime::register::register_realtime_device` (`lib.rs:120`)

### 3.5 Frontend: call `registerDevice`, then connect

`registerDevice(identityId, wif)` already exists and is exported. It must be called **once we have a WIF**.

**Important constraint:** the WIF must not be persisted or held long-term in the frontend. Today the pattern for obtaining one is on-demand from Rust, e.g. `useDocuments.ts:42` does `await keys.getTransferKey(_identityId)`. Follow that pattern: fetch, use, discard.

**Also required:** this must be a no-op for a *write-only* connection, which has no private keys. `build_authenticated_url()` already returns `None` for that case (`client.rs:91`), and that is a normal condition, not an error.

---

## 4. Items needing a human decision (do not guess)

### 4.1 There is no in-app notification UI — **RESOLVED (see §C.8)**

`state.recent` was populated but **never rendered anywhere**:

```bash
grep -rn "realtime.recent\|\.recent" src/ --include=*.vue
# -> (no output)
```

So notifications surfaced **only** as OS notifications, including for a window the
user was already looking at. The doc comment at `useRealtime.ts:143` claimed
*"the event is still retained in `recent` so the UI can surface it in-app"* — that
in-app surface **did not exist**.

**Resolution:** an in-app toast is now shown when the window is focused, and the
OS notification is suppressed in that case. A global toast host already existed
(`AppLayout.vue` + `useNotification`); the realtime path simply never used it. See
§C.8.

### 4.2 When should connect/disconnect be triggered?

Candidates: identity connect, app mount, network change, and idle. Needs a decision, because it determines the lifecycle and the reconnect-storm risk.

### 4.3 The fan-out has never been proven to reach a desktop-only identity

The manager's `sendWs.js` publishes per identity. **No desktop-only identity (UUID `deviceToken`, `platform: 'desktop'`) has ever been confirmed reachable end-to-end.** This is the acceptance test for the whole feature.

---

## 5. Acceptance test — the only proof that matters

Do not consider this done until this passes:

1. Launch the app, connect a testnet identity that has a signed message capability
2. Confirm `GET https://evonext.app/ws/stats` reports `identities: 1`, `sockets: 1` ← **PASSES as of the `e85f5dfd` deploy; see §C.9**
3. Trigger a notification server-side (e.g. a Yappr post event for that identity)
4. Confirm an OS notification appears, and `EVENT_STATUS` reaches `connected`

Step 2 is a **direct, objective measurement** of whether the socket opened. It
read `0/0` while the deploy was outstanding; it now reads `1/1` and the
handshake returns `101`. Steps 3-4 (a published event actually arriving) are
**still unproven** — see §C.9.

---

## 6. Test baseline (do not regress)

| Suite | Result |
|---|---|
| Rust (`check.sh` step 2) | **930 passed / 0 failed / 5 ignored** |
| `cargo clippy` | **0 errors**, both feature configs |
| `cargo fmt` | clean |
| `crypto::` | 25 passed |
| `realtime::` | 40 passed |
| Frontend | **71 files / 639 tests** |
| `tsc --noEmit` | clean |

> **Caveat worth knowing:** `check.sh` is 27 lines and runs **only** `cargo test --lib` and `pnpm exec tsc --noEmit`. It does **not** run the frontend test suite. Run `pnpm test` separately — this session found 4 real TS regressions that `check.sh` alone did not surface (they came from a prior session's Transaction History work: `transforms.ts` typed `network` as `string` where the consumer required `'mainnet' | 'testnet'`, plus two `noUncheckedIndexedAccess` violations in `transactionHistory.contract.test.ts`). Those are now fixed.

---

## 7. Also open in this repo

| Item | State |
|---|---|
| `tauri-plugin-notification` + UI | plugin + composable correct; **UI rendering unconfirmed** (§4.1) |
| Transaction History | root-caused and fixed in a prior session (`unwrapTransitions`, per-network contract IDs). Guards added: `transactionHistory.contract.test.ts` |
| Feed / identity discovery | guarded by a two-layer permanent regression suite (Rust contract tests + TS runtime validator + static source sweep) |
| macOS build | blocked on MacInCloud (~next week) |
| Unreproduced flaky Rust test | one `849/850` observed once; never reproduced |

---

## 8. Checklist for the desktop team

- [ ] Add `RealtimeHandle::new()` (§3.1)
- [ ] Add `connect_realtime` / `disconnect_realtime`, both feature-gated (§3.3)
- [ ] Have `connect_realtime` **install the handle before spawning `run`** (§3.2)
- [ ] Register `RealtimeState` via `.manage(...)` in `lib.rs` (§3.4)
- [ ] Add both commands to `generate_handler!` (§3.4)
- [ ] Call `registerDevice(identityId, wif)` — WIF fetched on demand, never persisted (§3.5)
- [ ] Ensure write-only connections are a clean no-op (§3.5)
- [ ] Decide the connect/disconnect trigger points (§4.2)
- [ ] Decide whether to build an in-app toast, or fix the misleading comment (§4.1)
- [ ] **Pass the acceptance test in §5** — `identities: 1`, `sockets: 1`, OS notification received
- [ ] Re-run `check.sh` **and** `pnpm test` (§6)

---

## 9. Server-side reference (already live — no server work needed)

| Topic | Location |
|---|---|
| NotifyHub Durable Object | `evonext-api/src/durable/NotifyHub.ts` |
| WS endpoints | `evonext-api/src/ws.ts` (`GET /ws/connect`, `POST /ws/publish`, `GET /ws/stats`) |
| WS auth verifier | `evonext-api/src/libs/wsAuth.ts` |
| Routes | `evonext-api/wrangler.jsonc` → `evonext.app/ws`, `evonext.app/ws/*` |
| Manager fan-out | `evonext-manager/src/sendWs.js` |
| Architecture writeup | `evonext-desktop/docs/HANDOFF-realtime-websocket.md` |

**Note on the server's verifier:** as of this writing the deployed worker (`3a8df99c`) still contains the old, unusable verification path. A fixed verifier exists locally but has **not been deployed** (see the API/`evonext-js` handoff). The Rust client's handshake format is already correct for the fixed verifier — cross-language hash identity is proven in §2.3 — so the client can be built against the fixed behavior now.
---

# COMPLETION REPORT — wiring done

**Status: the three gaps are closed and the two blockers the handoff missed are fixed.**
Nothing is deployed (no server change was needed) and no version was bumped.

## C.1 The handoff's three gaps — all closed

| Gap | Fix |
|---|---|
| `client::run()` never called | `realtime::commands::connect_realtime` spawns it; called from the frontend lifecycle |
| `RealtimeState` not managed | `app.manage(realtime::state::RealtimeState::default())` in `lib.rs` `.setup()` |
| No command opens/closes the socket | `connect_realtime` / `disconnect_realtime` added and registered in `generate_handler!` |
| Frontend never called `registerDevice` | `useRealtimeLifecycle` calls `startRealtimeForIdentity` → register **then** connect |

New/changed Rust:

* `src-tauri/src/realtime/state.rs` — `RealtimeHandle` (`new`, `stop`, `is_stopped`) + `RealtimeState`. Placed **outside** the feature gate because `generate_handler!` cannot be conditionally compiled.
* `src-tauri/src/realtime/commands.rs` — the two commands, with 6 unit tests. Both reject blank input via `trim().is_empty()`.
* `src-tauri/src/realtime/live_tests.rs` — two `#[ignore]`d live tests (see C.4).
* `src-tauri/src/lib.rs` — state managed, commands registered, TLS provider installed first.
* `src-tauri/src/realtime/client.rs` — `run`/`emit_status`/`serve_socket`/`handle_text_frame` made generic over `R: Runtime`.

New/changed frontend:

* `src/composables/useRealtimeLifecycle.ts` — binds the socket lifetime to `Identity.identityId`.
* `src/composables/useRealtime.ts` — `connectRealtime`, `disconnectRealtime`, `startRealtimeForIdentity`, `resetRealtimeState`, `state.lastError`.
* `src/App.vue` — instantiates the lifecycle at **setup scope** (not inside `onMounted`; `onUnmounted` cannot be registered from an async callback).
* `src/composables/useRealtimeLifecycle.test.ts` — 13 tests.

## C.2 BLOCKER 1 — every real testnet key was rejected (`decode_wif`)

**This was not in the handoff and would have silently disabled the feature on the default network.**

`src-tauri/src/crypto/signed_message.rs` `decode_wif` accepted **only** version byte `0x80` (mainnet). The app's default network is testnet (`src/utils/env.ts:21`), and the real keystore stores testnet WIFs (`0xef`, prefix `c...`) — confirmed by base58-decoding a real backup. So `decode_wif` returned `None` for every key the app actually stores, the client exited immediately, and **no socket was ever attempted and no error was logged**.

Fixed to accept both, with `WIF_VERSION_MAINNET` / `WIF_VERSION_TESTNET` named constants. Three tests added first (`test_decode_wif_accepts_testnet_version_byte`, `test_decode_wif_testnet_and_mainnet_yield_the_same_key_material`, `test_decode_wif_rejects_an_unrelated_version_byte`), confirmed failing before the change. `register.rs`'s `test_wif()` helper had a comment normalising the rejection as correct — corrected, plus `payload_accepts_a_testnet_wif` and `testnet_and_mainnet_wifs_produce_identical_payloads`.

## C.3 BLOCKER 2 — rustls panicked on the first handshake

**Also not in the handoff. This was a hard crash, not a failure.**

rustls 0.23 removed the implicit provider default. Two provider crates are compiled in — `aws-lc-rs` (via `reqwest` → `default-tls` → `hyper-rustls`) and `ring` (via `tauri-plugin-updater`) — so every `ClientConfig::builder()` **panics**:

```
Could not automatically determine the process-level CryptoProvider from Rustls crate features.
```

Reproduced live before fixing. Fixed by adding `rustls = { version = "0.23.36", default-features = false, features = ["std", "aws-lc-rs"] }` and installing the provider explicitly in `crypto::tls::install_tls_provider()`, called **first** in `lib.rs` `.setup()` so no subsystem can observe the ambiguous state. `aws-lc-rs` chosen because `reqwest` already compiles it, adding no new native build step. 4 tests; mutation-proven (a no-op `install_tls_provider` makes `a_client_config_can_be_built_after_installing` fail).

## C.4 The acceptance test — MEASURED

The handoff's §5 acceptance test was run against production in two stages,
because at that time the server verifier fix was **not yet deployed**. *That
section is kept for the record. The deploy has since happened — the final
result is in §C.9 below.*

**Stage 1 — the client reaches the server correctly.** `live_socket_opens_and_the_server_sees_it` gets a clean `401 {"error":"signature verification failed"}`, not a TLS panic and not a connection failure. Before C.3 this same test panicked; before C.2 it never got as far as a URL.

**Stage 2 — the signature the desktop produces is VALID, verified offline against the fixed verifier.** The exact signed URL from the Rust client was re-verified with `evonext-api/src/libs/identitySignature.ts` against the live `get_identity_keys` response for the signing identity:

```
message bytes: 146                     <- matches the shared vector
decoded layout=v-last i=0
  dash(0x19)    => matched=true  recovered=e6a371fcce04811a0d1bfd29b6dde456ce1f19c0
  bitcoin(0x18) => matched=false recovered=0a059d2bffc8c60b4feb9fe3beef154ab10ae886
```

`e6a371fc...` is **keyId 1, AUTHENTICATION / CRITICAL** — precisely the key that signed. The Bitcoin magic correctly does not match, proving the two formats stay separated. So the only thing that stood between the desktop and a live socket was the `evonext-api` deploy.

**Measured after the deploy:** the `401` became `101 Switching Protocols`
against `wss://evonext.app/ws/connect`, and `/ws/stats` reported
`{"identities":1,"sockets":1}`. See §C.9.

## C.5 A real bug found by the new frontend tests

The `never forwards an empty WIF to a Rust command` test failed on first run against unmutated code: `!wif` accepts a **whitespace-only** WIF, which is truthy but decodes to nothing, so Rust would report "invalid WIF" instead of the condition being skipped as a write-only connection. Guard hardened to `!wif?.trim()` in `startRealtimeForIdentity` (the Rust side already trimmed).

**Mutation results for the lifecycle guards:**

| Mutation | Outcome |
|---|---|
| connect before register | **CAUGHT** (9 failures) |
| remove the lifecycle's `!wif` guard | **SURVIVED** — equivalent mutant, `startRealtimeForIdentity` holds the same guard. Documented in the test; the invariant is now pinned directly instead of via one guard |
| remove the same-identity short-circuit | **CAUGHT** (1 failure) |
| set `connectedFor` unconditionally | **CAUGHT** (1 failure) |

## C.6 Gates

| Gate | Result |
|---|---|
| `./check.sh` | **exit 0** |
| Rust (`cargo test --lib`) | **930 passed / 0 failed / 5 ignored** |
| Rust (`--features realtime`) | **930 passed / 0 failed / 7 ignored** |
| `cargo clippy` | **0 errors**, both configs (warnings all pre-existing; **zero** in the new files) |
| `cargo fmt` | clean |
| Frontend | **70 files / 626 tests** (was 69/613) |
| `tsc --noEmit` | clean |

## C.7 Still open (as of §C.4, since superseded — see §C.9)

1. ~~**`evonext-api` deploy**~~ — **DONE**, `e85f5dfd-9b25-4d05-8e4c-f3bbae76eeb3`.
   See §C.9.
2. ~~**In-app toast UI** (§4.1).~~ — **DONE**, see §C.8.
3. ~~**Desktop-only identity fan-out** (§4.3)~~ — **PARTLY DONE.** A desktop
   registration returns `200 {"success":true}`, and the manager fan-out query
   requires only `identityId IS NOT NULL`, so a desktop row **is
   discoverable**. What is still unproven is an event actually *arriving*:
   see §C.9.
4. **Trigger points** (§4.2) — decided and implemented: watch `Identity.identityId`, `immediate: true`. This was a decision the handoff deferred; it is now `useRealtimeLifecycle`.

## C.8 In-app toast UI — COMPLETE

### C.8.1 What already existed (do not rebuild)

A global toast host was **already present and working**:

| Piece | File |
|---|---|
| Toast component (per item) | `src/components/Notification.vue` |
| Queue + `show()` / `dismiss()` | `src/composables/useNotification.ts` |
| Render host | `src/layouts/AppLayout.vue` — `v-for="n in notifications"` |
| Mount point | Every route is a child of `AppLayout` (`src/router/index.ts:16`) |

`useNotification` keeps its queue at **module scope** (`const notifications = reactive([])`),
so any caller shares the same array and lands in that host. The realtime path
never called it.

### C.8.2 The rule

* window **FOCUSED** → in-app toast only
* window **UNFOCUSED** → OS notification only

Exactly one, never both and never neither. The previous behaviour was OS-only
regardless of focus, which duplicates what is already on screen and on several
platforms steals focus for no reason.

### C.8.3 Implementation

| File | Role |
|---|---|
| `src/composables/useRealtimeToast.ts` | **NEW.** `handleRealtimeNotify(event)` — resolves focus, dispatches to exactly one channel. Never throws. |
| `src/composables/useRealtime.ts` | `handleNotify` now records to `state.recent` **unconditionally**, then delegates presentation. `showOsNotification` and `titleFor`/`bodyFor` are now exported. |
| `src/composables/index.ts` | re-exports `handleRealtimeNotify` |

**Separation of concerns, deliberate:** recording and presentation are different
jobs. `state.recent` is the durable in-session record and must not depend on
window focus, on the OS permission result, or on whether a toast rendered.
Presentation is the only thing that varies.

**Focus-detection failure is treated as FOCUSED.** An in-app toast in a window
that is actually hidden is merely invisible; an OS notification suppressed on a
wrong guess is lost outright. The pessimistic direction is the one that
guarantees delivery.

**No capability change was required.** `core:window:default` already includes
`allow-is-focused` — verified in `src-tauri/gen/schemas/desktop-schema.json`
(`core:window:default` expands to include `allow-is-focused`), so
`getCurrentWindow().isFocused()` was already permitted.

**Import direction:** `useRealtime` → `useRealtimeToast` → `useRealtime`. The
cycle is safe (nothing runs at module-evaluation time, and ES hoisting resolves
it), and it avoids duplicating the permission gate. Noted in the file; if it ever
grows, move `titleFor`/`bodyFor` into a third module.

### C.8.4 Tests — 13, all four mutations caught

`src/composables/useRealtimeToast.test.ts`:

| Mutation applied | Result |
|---|---|
| ignore focus, always send OS notification | **CAUGHT** (6 failures) |
| ignore focus, always show toast | **CAUGHT** (3 failures) |
| show BOTH on a focused window | **CAUGHT** (1 failure) |
| focus-detection failure → treat as UNfocused | **CAUGHT** (1 failure) |

Also covered: the OS path is delegated (title/body formatted exactly once, in
`useRealtime`), an unexpected payload never throws, and a throwing toast host or
OS plugin never tears down the listener.

The test file caught **two real defects while being written**:

1. `titleFor` and `bodyFor` were **not module exports** — only reachable via the
   `useRealtime()` return object. Importing them returned `undefined`, so every
   toast call threw and was swallowed. Fixed by exporting both.
2. `state.recent` was initially asserted to be written by the presentation
   bridge. It is written one level up, in `useRealtime.handleNotify`, and the
   test now pins that boundary explicitly rather than leaving it implicit.

### C.8.5 Gates

| Gate | Result |
|---|---|
| `./check.sh` | **exit 0** |
| Rust (both configs) | **930 / 0 failed** |
| `cargo fmt` | clean |
| Frontend | **71 files / 639 tests** (was 70/626) |
| `tsc --noEmit` | clean |

### C.8.6 Still not verified

The toast has **not been observed rendering in a running app.** The logic is
unit-tested and mutation-proven, and the host it renders into is pre-existing and
in active use by `ConnectSeedForm.vue` and `ComposeModal.vue` — but an actual
realtime event arriving while the window is focused has not been seen on screen.
That requires the `evonext-api` deploy (§C.4) so a socket can stay open long
enough to receive a published event.

---

## C.9 The deployed acceptance test — MEASURED (2026-09-22)

§C.4 left three things unmeasured because the `evonext-api` verifier fix was
not deployed. The deploy has since happened
(`e85f5dfd-9b25-4d05-8e4c-f3bbae76eeb3`, source `f45efe4`), and all three were
re-run against production from the real Rust client.

| Handoff §5 step | Result |
|---|---|
| 1. Connect a testnet identity | identity `34vkjdeUTP2z798SiXqoB6EAuobh51kXYURqVa9xkujf` |
| 1. Handshake reaches `101` | **YES** — `HTTP status: 101 Switching Protocols` |
| 2. `/ws/stats` shows `identities:1, sockets:1` | **YES** — sampled once/second from t=2s to t=6s while held |
| 3. Registered a desktop device | **YES** — `POST /v1/push/register` → `200 {"success":true}`
| 4. A published event ARRIVES in the client | **NOT PROVEN** |

### How each was measured

- **Handshake.** `live_socket_opens_and_the_server_sees_it`
  (`src-tauri/src/realtime/live_tests.rs`, `#[ignore]`d) opened
  `wss://evonext.app/ws/connect` and observed `101`.

  > **Measurement caveat.** `curl` cannot observe this. Over HTTP/2 Cloudflare
  > strips the `Upgrade` header and `curl` reports a misleading `426`. A raw
  > TLS socket returned `401` for an invalid signature, which is the correct
  > rejection, but only a client that performs the real upgrade sees `101`.

- **`/ws/stats`.** Polled once per second during the hold. It reads `0/0`
  before and after and `1/1` while the socket is open. An earlier probe
  sampled only *after* the 5s hold had ended and read `0/0`, which looks
  identical to a failure — the timing is the whole measurement here.

- **Registration.** A new `#[ignore]`d test
  `live_registration_creates_a_push_devices_row` uses the **production**
  `build_registration_payload` and mints an **ephemeral** device token so it
  cannot clobber a real install's stable `deviceToken`. It asserts
  `success:true`. This is separate from the socket test because a socket can
  open without being discoverable by the fan-out — discoverability needs the
  `push_devices` row.

- **Invalid signature stays rejected.** A raw TLS socket with a bad signature
  received `HTTP/1.1 401 Unauthorized`, proving the fix did not widen
  acceptance.

### §4.3 desktop-only fan-out — what is and is not proven

**Proven:** a desktop-only identity **is** discoverable. Two independent facts:

1. The registration above returned `200 {"success":true}` for a
   desktop-platform row. The `UNIQUE` constraint in
   `evonext-api/migrations/0001_push_devices.sql` is on `deviceToken`, **not**
   on `identityId`, so a desktop row is an ordinary row. `platform` is a
   free-form string, so no schema change was needed. **The earlier "Known
   limitation" claiming otherwise was false** and has been corrected in
   `HANDOFF-realtime-websocket.md`.
2. The manager's fan-out query
   (`evonext-manager/src/manageYapprPosts.js:148-156`) is
   `SELECT DISTINCT identityId FROM push_devices WHERE identityId IS NOT NULL`
   — it does **not** require a mobile token.

**NOT proven:** that a **published event actually reaches the socket**. This is
§5 step 4, and it is the only step where handoff, client and server all meet.
It needs either a real Yappr post for the registered identity or a direct
`POST /ws/publish`. The latter requires `WS_PUBLISH_SECRET`, whose value is
write-only and which the desktop side has declined to request (see below).

**Until that is observed, no one should claim notifications work end-to-end.**

### A design finding: `POST /ws/publish` should not use a shared secret

`src/ws.ts` authenticates `/ws/publish` with `WS_PUBLISH_SECRET`: a symmetric
`secret_text` compared with `timingSafeEqual`. Because it is **symmetric** and
**write-only**:

- it cannot be read back, so it cannot be audited;
- it cannot be rotated without a coordinated redeploy of both workers;
- any holder can forge a notification to **any** identity.

The last point is a phishing primitive, not a theoretical weakness: a forged
`registrar_ready` event renders as a native OS notification (`bodyFor` →
*"Your username X is ready to register!"*, reaching `showOsNotification` when
the window is unfocused).

**Recommendation (raised with the API team; their call to schedule):** replace
the shared secret with a **signed publish request**, reusing the
`identitySignature.ts` machinery already shipped. The verifier would hold a
**public key**, which is safe to publish in an open-source repository, and
requests become attributable and rotatable without a coordinated redeploy.

This is why the desktop side **declined to request the secret value**: it is a
production credential held only to run one acceptance test, and the correct fix
removes the need for it entirely.
