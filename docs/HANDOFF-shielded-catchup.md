# HANDOFF — SHIELDED CATCH-UP (evonext-desktop, 2026-11-14 session)

**Mission (owner):** the web (evonext.app, F40–F55) and mobile (evonext-mobile)
teams shipped shielding + wallet UI/UX; desktop catches up. Release target:
**v26.11.14**.

**Status after this session:** the COMPLETE proven shielded stack is ported,
KAT-verified, and wired into the wallet UI. See "What landed" below.

---

## 1. What landed (and where it came from)

### 1.1 The engine port (Phase 1) — src/lib/

Mirrored `evonext.app/lib/` → `src/lib/` 1:1 so every relative import is
unchanged:

| Ported | From | Notes |
|---|---|---|
| `src/lib/shielded/` (26 files) | evonext.app lib/shielded | the KAT-verified engine: curves, note crypto, PCZT, prover transport, sync, wallet flows, engine worker/client, reference wires |
| `src/lib/dash-wasm/` (28 MB) | evonext.app lib/dash-wasm | the wasm SDK (wasm_sdk.js + 26,513,399-byte wasm) + compat layer |
| `platform-address.ts`, `core-chain.ts`, `dapi-proxy.ts`, `dapi-seeds.ts`, `direct-grpc.ts`, `wallet-assets.ts`, `moves-service.ts`, `wallet-manager.ts`, `secure-storage.ts`, `constants.ts`, `types.ts` | evonext.app lib/ | supporting wallet libs |
| `src/lib/services/wasm-sdk-service.ts` | evonext.app | adapted: Vite `?url` init (the glue's parameterless init() resolves import.meta.url against the BUNDLE), dead contract-service import dropped |
| `src/lib/services/index.ts` | NEW barrel | desktop boundary: re-exports wasm-sdk-service only |
| `src/lib/identity-manager.ts` | NEW boundary stub | getIdentities() throws LOUDLY — desktop discovery (src/services/identity/discovery) wires in later; the token KATs mock it |
| `src/lib/desktop-prover.ts` | NEW | the desktop prover transport (Tauri invoke) |

**Compile parity decision:** the ported files carry `// @ts-nocheck` with a
header comment — the upstream code is type-checked under the web tsconfig
(no exactOptionalPropertyTypes / noUncheckedIndexedAccess); rewriting 132
KAT-verified expressions with `!`/undefined-juggling would have been a much
larger, riskier diff. Runtime behavior is proven by the ported KAT suites.

### 1.2 The prover CORS solution (the F40 lesson, desktop edition)

The prover (https://prover.sansbank.dev) answers NO CORS preflight — a
Tauri webview fetch dies exactly like the browser's did. Desktop routes the
frame through Rust:

- `src-tauri/src/commands/shielded_commands.rs` — `shielded_prove_pczt`
  command: reqwest POST (octet-stream) → the prover's JSON body returned
  VERBATIM (status + body; NO verdict interpretation on the Rust side).
  Timeout 240s (observed cold proves 60–135s). 3 unit tests. Registered in
  `lib.rs`.
- `src/lib/desktop-prover.ts` — main-thread transport (invoke-based).
- `src/lib/shielded/prove.ts` — NEW transport hook (`setProverTransport`):
  when installed, postPcztFrame rides it; the default web/Node fetch path
  is UNTOUCHED. Retries + verdict parsing + the frame-integrity check stay
  1:1.
- `src/lib/shielded/engine-worker.ts` — the worker cannot reach Tauri IPC
  (`window.__TAURI_INTERNALS__` is window-bound), so its prover calls hop
  over the message pump: worker `proveRequest` → engine-client →
  desktop-prover → Rust → `proveResult` back. NO timeout on the hop (the
  prover legitimately takes 60–135s).

### 1.3 Session mnemonic bridge

The ported lib reads the mnemonic via `secure-storage` (localStorage key
`'mnemonic'` — exactly where the web app kept it). Desktop source of truth
is the RUST KEYSTORE (`load_mnemonic`); `useShieldedEngine.ensureStarted()`
fetches it once per session and primes the bridge so the 1:1 library code
resolves it synchronously. WIF-only sessions (no seed) → `engineAvailable =
false` → the UI degrades gracefully (F55 parity: seed-derived features
unavailable).

### 1.4 KAT suites — tests/shielded/ (17 files, 158 tests, ALL GREEN)

Ported from evonext.app test/unit/lib with import-path rewrites:
crypto(39), sync(8), tree(8), bundle(8), prove(8), pczt-wire(15), assemble(4),
reddsa(6), encrypt(6), value(7), poseidon-nullifier(10), reference-wire(11),
dapi-proxy(10), wallet-assets(6), token-facts(5), token-send(6),
compat-derive(1). Fixtures in `tests/fixtures/`. The desktop's full suite:
**836/836 green** (90 files).

### 1.5 The wallet UI (Phase 2) — parity with the web F40–F55

| File | What |
|---|---|
| `src/composables/useShieldedEngine.ts` | NEW — the engine lifecycle composable: single-flight start (F50c), reactive balance (persisted seed + live scan), history, send/settle/receiveAddress/poolExit; `CREDITS_PER_DASH = 1e11` + the single conversion boundary (the mobile balance-model defect §6 rule) |
| `src/stores/wallet/actions/index.ts` | refreshBalances rebuilt to the owner's 4-row model: **Transparent** (DIP-17 pool, F46, bounded 3×90s) + **Shielded ALWAYS rendered** (F45, persisted seed) + tokens; the duplicate 'dash'/'credits' rows removed (the identity balance is NOT a wallet row — dashboard + TOTAL); fixed row order (the usdValue sort is gone) |
| `src/screens/wallet/Overview.vue` | TOTAL balance = identity + Transparent + Shielded (F50a) with the three-tile breakdown; FIXED a real 1e8 double-conversion bug on the identity display; live shielded overlay in the AssetList; scan kicks off on mount |
| `src/components/wallet/AssetList.vue` | rows normalized by id; the Shielded tile carries the shield badge (both rows are DASH — the marks must differ, the mobile lesson); the Shielded row routes to the full-screen shielded wallet |
| `src/screens/wallet/Shielded.vue` | NEW full-screen pool wallet (F40/F41): balance + scan progress, receive (address cycler + QR + copy), send (dash1z/tdash1z + memo + honest errors + settle poll), history (sent/self/received + SPENT badges) |
| `src/router/index.ts` | + `/wallet/shielded` route |
| `src/screens/wallet/Deposit.vue` | rebuilt to F50b: ONE address at a time behind a segmented selector (Transparent \| Shielded \| Identity), QR 148 + mono address + copy + per-target caution; the shielded receive address comes from the engine worker |
| `src/components/wallet/MoveCard.vue` | NEW (F54): the internal-move card on the Deposit/Receive tab — the four live-verified lanes (11 Transparent→Identity, 15 Transparent→Shielded, 22 Shielded→Identity, 17 Shielded→Transparent) |
| `src/screens/wallet/Swap.vue` | rebuilt to F47: Uniswap-style (bootstrap notice, pair chips with the disabled flip, two-panel form, payable line from the funding wallet, POST swap + deposit QR + 10s status poller, 'Your swaps' history). Desktop calls the SAME key-holding proxy the web deployed: `https://evonext.app/api/dashswap` (the API key lives server-side; CSP already allows https:) |
| `src/screens/wallet/Send.vue` | the F53d fix: the explorer link renders ONLY with a real 64-hex transition hash; otherwise the honest no-hash message (the desktop's raw-transition paths already return REAL hashes and the phantom-token send already fails honestly via tokens.contractInfo) |
| Connect (F55c) | NO change needed — the desktop's `ConnectMethodTabs` already IS the prominent segmented control the web had to adopt |

### 1.6 Dependencies (exact pins per the repo rule)

`@noble/ciphers@2.4.0, @noble/curves@2.4.0, @noble/hashes@2.4.0,
@scure/bip39@2.4.0, bs58@6.0.0, @dashevo/dashcore-lib@0.26.1, buffer@6.0.3,
vite-plugin-node-polyfills@0.28.0` (0.28 is the first with a vite ^8 peer
range). `vite.config.ts` carries the nodePolyfills plugin (Buffer/process
for the ported stack, workers included); `vitest.config.ts` deliberately
does NOT (tests run in real Node — node:fs must stay native for the KAT
fixtures).

**Lockfile note:** HEAD's pnpm-lock.yaml was ALREADY inconsistent with
package.json (vite@7.1.9/vitest@4.0.18 in the lock vs the committed pins
8.3.7/5.1.0 — pre-existing since the f8916dc stack upgrade). The `pnpm add
-E` run synced them; the lockfile now matches package.json exactly.

---

## 2. The build/runtime invariants (do not rediscover)

1. The wasm is 26,513,399 bytes; BOTH the main thread (wasm-sdk-service)
   and the worker init their own instance — that is the web's shipped
   design (the worker owns scan/spend; the main thread only for the
   shield/asset-lock flow + Transparent reads).
2. Engine `start()` is SINGLE-FLIGHT — every component shares one init
   (three concurrent 'init' messages break the wasm's closures, F50c).
3. The prover takes 60–135s cold; the first proving-key build ~10s —
   honest progress phases, never a bare hang.
4. `1 DASH = 1e11 CREDITS` — convert at exactly ONE boundary
   (useShieldedEngine.creditsToDash/displayDash).
5. Shielded fees are CONSENSUS-PINNED (never invent a fee field):
   base 2-action minimum 114,140,000; unshield 120,222,800 (3 actions
   157,292,800); top-up-from-pool 114,359,200; shield-from-identity floor
   149,760,000 (metered, may charge less); shield-from-transparent charges
   84,000,000 + GroveDB-metered storage; asset-lock shield
   164,140,000 for 2 actions.
6. Pool-exit selector gets the NET only; topUpAmount (22) is the GROSS;
   raw identity-nonce transitions carry CURRENT+1; the wasm PlatformAddress
   21-byte form is TAG(0/1)||hash160 (NOT the 0xb0 bech32m byte).
7. The engine worker's postMessage pump carries 'persist' blobs to the
   main thread's localStorage (`evonext_shielded_sync_<network>`) — the
   Tauri webview persists localStorage across restarts, 1:1 with the web.

## 3. Not yet wired (open items, in priority order)

1. `identity-manager.getIdentities` — the desktop boundary stub throws;
   wire it to src/services/identity/discovery (SeedDiscovery) so the
   ported wallet-manager getAuthKey/getTransferKey work end-to-end. Until
   then the desktop's OWN transaction paths (useTransactions, raw
   transitions with REAL hashes) keep serving sends — the ported
   wallet-manager is in place for parity but not on the hot path.
2. Real-funds testnet verification pass (the F-gate standard: scan →
   receive parity → send → shield → unshield → top-up). Requires a testnet
   session with seed + funds; run from a dev build.
3. Token send UX: the F53c confirmation ('balances after the transfer')
   when the ported sendToken takes over the hot path (item 1).
4. Swap: the DashSwap team's ten open questions (../dashswap-api
   EVONEXT-SWAP-UI-HANDOFF.md) — status vocabulary is pattern-matched;
   testnet host unresolved (the proxy is mainnet-hardcoded until they
   confirm).
5. Withdraw UI: the desktop's Send ALREADY has the L2→L1 withdrawal path
   (the F25-proven withdrawDash); the pool→L1 ShieldedWithdrawal lane is
   available via the engine but intentionally has no user-facing button
   (the owner directive: L1 is an on-ramp; the web shipped the same).

## 4. Verification gates for this tree

    npx tsc --noEmit          # 0 errors
    npx vitest run            # 836/836 (90 files; incl. the 17 ported KAT suites)
    # ON EVORUNNER ONLY (never the host):
    pnpm build                # frontend bundle incl. the 26.5MB wasm asset
    cargo test                # Rust suite incl. shielded_commands
    ssh evorunner '~/builds/evonext-desktop-release.sh v26.11.14 --windows'

## 5. Sources (the records this session builds on)

- evonext.app AGENTS.md F40–F55 (the complete engineering log)
- evonext-mobile: AGENTS.md wallet model, HANDOFF-wallet-balance-model.md,
  HANDOFF-shielded-uiux.md, HANDOFF-rsffi-pool-edge-moves.md
- THIS repo: docs/HANDOFF-DCG-SDK-AND-SHIELDED.md (the September plan —
  §4 Option A was the original route; the shipped route is the web stack
  port, which carries the COMPLETE move matrix + history that even the
  native crates do not expose yet: rsffi 21/22/9 are absent upstream).
