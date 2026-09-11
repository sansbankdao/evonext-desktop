# HANDOFF — DCG SDK Integration + Full Orchard/Halo2 Shielded Support

Author: EvoNext mobile team (post-review of this repo, commit 4d874b9)
Date: 2026-09-08
Audience: evonext-desktop engineering team
Status: REVIEW FINDINGS + IMPLEMENTATION PLAN. Nothing here is committed
to your repo yet — this file is a working document left uncommitted in
your tree.

---

## 1. Executive Summary

The desktop app is ~70% of the way to the official DCG SDK already:
post creation and credit transfers run on `@dashevo/evo-sdk`, and the
Rust backend has a clean DAPI-over-HTTP client with 30 test files. What
remains is (a) retiring the legacy `dash-platform-sdk` + `pshenmic-dpp`
write paths, (b) upgrading evo-sdk from 3.0.0-dev.11 to current, (c)
repointing the dead dashqt.org endpoints to `dapi.sansbank.dev`, and
(d) adding shielded support — which on desktop is dramatically simpler
than on mobile because Tauri is Rust: you link the same
`rs-unified-sdk-ffi` crate the mobile team ships on Android as a NATIVE
dependency. No JNI, no WASM, no Hermes.

Estimated effort: DCG SDK consolidation 2–4 days; shielded 5–10 days
including UI. Mobile's shielded took ~3 weeks because of Android JNI +
Hermes ABI constraints that DO NOT exist on desktop.

---

## 2. Current-State Inventory (verified against sources)

### 2.1 Three parallel SDK stacks today

    Stack                         Used for                            Verdict
    ----------------------------- ----------------------------------- ---------------
    @dashevo/evo-sdk 3.0.0-dev.11 createPost (services/posts/          KEEP — upgrade
    (DCG official, WASM)          mutations.ts:24), sendCredits +      to 4.x
                                  creditWithdrawal (composables/
                                  useTransactions.ts:395), read path
                                  (services/DashPlatformClient.ts)

    dash-platform-sdk 1.3.0-dev.12 updatePost (mutations.ts:70),       RETIRE
    (pshenmic, legacy)            useDocuments.ts generic doc create,
                                  usePlatformSdk.ts / usePlatform.ts
                                  SDK managers (whole-app read base)

    pshenmic-dpp 1.1.2-dev.4      PrivateKeyWASM signing in            RETIRE
                                  mutations.ts + useTransactions.ts

    src-tauri Rust DAPIClient     ALL reads via invoke(): get_posts,   KEEP — repoint
    (reqwest -> HTTP proxy)       identities, DPNS, tokens, status     endpoint (2.2)

### 2.2 Endpoints — dashqt.org is dead, switch to dapi.sansbank.dev

Four hardcoded references to `https://dashqt.org/v1/dapi`:

    src-tauri/src/constants.rs:21    DAPI_WEB_API_ENDPOINT
    src/utils/env.ts:34-35           fallback default
    src/utils/env.ts:57              fallback default
    src/composables/useBootstrap.ts:9  DASH_QT_API constant

The replacement is the Sansbank DAPI proxy:

    https://dapi.sansbank.dev/v1/dapi

POST contract (verified live 2026-09-08):

    {"method": "<method>", "params": <object|array>, "network": "testnet"|"mainnet"}

CRITICAL — param shape (broke the mobile app this week when the proxy
dropped legacy aliases; now verified):

    get_documents:  object with CANONICAL keys:
                    {dataContractId, documentType, whereClause?, orderBy?,
                     limit?, startAfter?, startAt?}
                    - omit null where/orderBy entirely (null fails
                      validation: "where clause must have exactly 3
                      elements" / serde "Option value, expected
                      Identifier")
                    - legacy keys contractId/type are REJECTED
                    - positional array form is REJECTED
    identity_fetch: positional array ["<identifier-or-name>"]
    get_identity_by_public_key_hash: positional ["<hex-hash160>"]
    get_status:     []

Your Rust `DAPIClient::request()` (dapi/client/base.rs:33) sends
`params` as a positional ARRAY — this now FAILS for get_documents
against dapi.sansbank.dev. You must either send the canonical object
shape for document queries or keep positional only for the methods that
still accept it (identity family). Our recommendation: object shape
everywhere it is accepted, positional arrays only where required
(identity_fetch).

Read-side `where` note: dapi.sansbank.dev auto-injects
`['$createdAt','>',0]` when you orderBy $createdAt (their
evoService.queryDocuments), so mobile's where clauses stay minimal.

### 2.3 Bugs found during review

1. P0 — `load_private_keys` Tauri command DOES NOT EXIST.
   Called from 5 frontend files:
     src/services/posts/mutations.ts (createPost AND updatePost)
     src/composables/useKeyManagement.ts
     src/screens/identity/ManageKeys.vue
     src/stores/identity/actions/get_key.ts
   `src-tauri/src/lib.rs:38` registers `load_keystore` but nothing named
   `load_private_keys`; capabilities/*.json does not alias it. Every
   call rejects at runtime => post creation/edit and key management are
   broken on desktop TODAY. Fix: register a `load_private_keys` command
   (or rename call sites to `load_keystore` if that is the intended
   handler and its return shape matches
   `keyData.identities[identityId][].{purpose,securityLevel,privateKey}`).

2. P1 — updatePost is a Franken-path: legacy dash-platform-sdk
   positional API + manual nonce arithmetic + PrivateKeyWASM, while
   createPost right above it uses evo-sdk. Port updatePost to evo-sdk
   `documents.replace` and delete the legacy imports.

3. P2 — `useDocuments.ts` generic document create still uses the legacy
   positional `sdk.documents.create(contractId, type, data, ownerId)` +
   `createStateTransition` flow. Same port treatment.

4. P2 — AGENTS.md references `src-tauri/src/config/` which does not
   exist; test counts and tree in AGENTS.md drift from reality.

5. P3 — Repo is still hosted on GitHub
   (`git@github.com:sansbankdao/evonext-desktop.git`). Mobile + infra
   repos moved to the private Gitea (repo.sansbank.dev, org sansbankdao)
   with CI on evorunner. Coordinate migration with the infra team; do
   not push new public mirrors.

6. Local-env note: node_modules on the review machine is a partial
   install (35 entries) so we did NOT run your test suite — tree left
   untouched. `pnpm test` triggers a full reinstall via the deps-status
   check.

---

## 3. DCG SDK Integration Plan

### 3.1 Target architecture (matches mobile's proven design)

    WRITE PATH (sign + broadcast):
      evo-sdk WASM in the frontend (Vue), upgraded to 4.x.
      - createPost / updatePost / deletePost
      - creditTransfer / creditWithdrawal
      - identity create/update, DPNS register
      Mobile proof: the SAME evo-sdk WASM runs our entire production
      bridge (WebView) and writes verified on-chain (testnet post
      2026-09-08, owner ADtgYG2M...LfFB).

    READ PATH (queries):
      keep your Rust DAPIClient -> dapi.sansbank.dev (it is genuinely
      good: caching, validation, 30 test files). Just fix the param
      shape per 2.2 and repoint the endpoint.
      Fallback: evo-sdk direct-to-platform reads when the proxy is
      unreachable (mobile's chain: DAPI -> WASM bridge -> native).

    HEAVY/CHAIN WORK (shielded, SPV, proofs):
      Rust native in src-tauri via rs-unified-sdk-ffi (section 4).

### 3.2 Version pin

    npm latest: 4.1.1 (stable, 2026)
    mobile Node-side probes pin: 4.2.0-dev.8 (exact)
    desktop today: 3.0.0-dev.11  <-- upgrade

    Recommendation: pin EXACTLY "4.2.0-dev.8" to match mobile's
    verified API surface (EvoSDK.testnetTrusted()/mainnetTrusted(),
    sdk.documents.query({dataContractId, documentTypeName, where,
    orderBy, limit}) returning a Map, sdk.documents.create({...}),
    sdk.identities.* object-style args). The project already uses exact
    pins — keep it that way; the 3.x -> 4.x dev train broke API
    compat more than once.

### 3.3 Migration checklist (write paths, in order)

    [ ] 1. Fix load_private_keys (P0) — unblocks everything below.
    [ ] 2. useTransactions.ts: replace PrivateKeyWASM signing with
           evo-sdk 4.x signer flow (it accepts privateKeyWif directly in
           transition options — no pshenmic-dpp import needed).
    [ ] 3. mutations.ts updatePost -> evo-sdk documents.replace.
    [ ] 4. useDocuments.ts -> evo-sdk object API.
    [ ] 5. Delete usePlatformSdk.ts + usePlatform.ts SDKManager for
           dash-platform-sdk; re-home any remaining read calls onto
           evo-sdk or the Rust DAPI client.
    [ ] 6. pnpm remove dash-platform-sdk pshenmic-dpp
           (pshenmic-dpp also lingers in src/types/lib.types.ts —
           retype against evo-sdk or local interfaces).
    [ ] 7. bundle: evo-sdk is ~10MB WASM; Vite handles it, but verify
           tauri build output size + updater delta.

### 3.4 Contract IDs (verified live 2026-09-08)

    Yappr posts   testnet  AyWK6nDVfb8d1ZmkM5MmZZrThbUyWyso1aMeGuuVSfxf
    Yappr posts   mainnet  NONE — contract EWR695... is testnet-only
                           (official yappr repo lib/constants.ts tags it
                           "Testnet - v10"; NOT_FOUND on mainnet).
                           Desktop currently hardcodes testnet ID via
                           YAPPR_CONTRACT_ID_TESTNET — formalize a
                           per-network map with mainnet=null + graceful
                           UI (mobile: PostsStore.CONTRACT_IDS).
    Yappr profile testnet  FZSnZdKsLAuWxE7iZJq12eEz6xfGTgKPxK7uZJapTQxe
    Yappr profile mainnet  NONE (NOT_FOUND)
    DPNS          BOTH     GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec
    DashPay       mainnet  Bwr4WHCPz5rFVAD87RqTs3izo4zpzwsEdKPWUT1NS1C7

    Bonus — usernames/avatars for free: mobile just shipped DPNS
    reverse-resolution (where records.identity == ownerId, contested-
    first, TTL cache) + Yappr profile merge (displayName/bio/avatar
    incl. DiceBear SVG generation, 30 styles, zero network). Sources to
    lift: evonext-mobile src/services/UsernameService.ts,
    src/helpers/avatar.ts, src/stores/PostsStore.ts fetchProfiles().

---

## 4. Full Orchard/Halo2 Shielded Support

### 4.1 Why desktop is the EASY platform for this

Mobile shipped shielded sends on Android via:
dashpay/platform `rs-unified-sdk-ffi` (Rust cdylib) -> JNI shim ->
Kotlin TurboModule -> JS. The hard parts were Hermes ABI traps and JNI
plumbing. NONE of that applies to Tauri: add the crate as a native
dependency, call its Rust API directly, expose thin Tauri commands.

### 4.2 The crate

    Repo:    https://github.com/dashpay/platform
    Package: rs-unified-sdk-ffi
    Pinned:  commit 37ea011c8723773c08b8a9941ceab6d743a08692
             (mobile's verified-working build; feature "shielded")
    Cargo:   [dependencies]
             rs-unified-sdk-ffi = { git = "https://github.com/dashpay/platform",
                                    rev = "37ea011c8723773c08b8a9941ceab6d743a08692",
                                    features = ["shielded"] }
             (package name/path may sit under packages/rs-unified-sdk-ffi
             — confirm the crate manifest name at that rev; mobile
             consumes the cdylib artifact, not the Rust API, so verify
             the lib target exports a usable Rust surface or link the
             C ABI via the shipped headers, see 4.4)

    Build-time warning: the full dependency graph is heavy (~10-20 min
    cold). The cdylib artifact is ~84MB (mobile, release-android).

### 4.3 Shielded API surface (from the shipped C header

    android/app/src/main/jni/rsffi/platform-wallet-ffi.h, 7679 lines —
    authoritative reference). Mobile wraps exactly these operations:

    Manager/pool lifecycle:
      platform_wallet_manager_... create/configure manager, bind wallet
      shielded_sync_start / _stop / _is_running / _is_syncing /
        _sync_now / _set_interval / _last_sync_unix_seconds
      shielded_sync_wallet, shielded_clear
      shielded_default_address (Orchard receiver for account)
      shielded_seed_pool_notes

    Prover (Halo2):
      platform_wallet_shielded_warm_up_prover()
      platform_wallet_shielded_prover_is_ready()
      platform_wallet_shielded_estimate_fee(kind, ...)
      FIRST PROVING-KEY BUILD TAKES ~10 SECONDS — warm it up at app
      start (splash/idle), never on the send-button handler.

    Value flows (all present and used by mobile):
      shielded_shield(...)                        core -> Orchard pool
      shielded_fund_from_asset_lock(...)          asset-lock -> pool
      shielded_resume_fund_from_asset_lock(...)
      shielded_transfer(...)                      Orchard -> Orchard
      shielded_unshield(...)                      pool -> platform addr
      shielded_withdraw(...)                      pool -> core address
      shielded_identity_create_from_pool(...)     fund identity from pool

    Persistence callbacks the HOST (you) must implement:
      on_load_shielded_outgoing_notes / _activity / _viewing_keys
      (+ matching _free fns) — the wallet stores decrypted notes,
      viewing keys and activity rows via host callbacks. On desktop use
      SQLite (sqlx/rusqlite) or your existing tauri-plugin-store files;
      mobile uses sqlite via the manager dbPath (nativeConfigureShielded
      mgr, dbPath in RsShieldedModule.kt:36).

    Mobile's Kotlin<->FFI mapping (1:1 semantic reference):
      evonext-mobile/android/.../rsffi/RsShieldedModule.kt lines 35-51
      nativeCreateManager / nativeConfigureShielded / nativeCreateWallet
      FromMnemonic / nativeBindShielded / nativeGetShieldedDefaultAddress
      / nativeShieldedSyncNow / nativePlatformAddressSyncBalances /
      nativeSpvStart|Stop|IsRunning|SyncProgress / nativeGetCoreBalance /
      nativeShieldedTransfer / nativeShieldedUnshield /
      nativeShieldedWithdraw / nativeGetShieldedSyncProgress

### 4.4 Two integration options (pick one)

    OPTION A (recommended): Rust API directly
      Depend on the crate in src-tauri/Cargo.toml, call its Rust
      functions from new commands/shielded_commands.rs, register in
      lib.rs invoke_handler, expose specta types like the rest of your
      command surface. Cleanest, fully testable with cargo test.

    OPTION B (if the crate only exposes the C ABI cleanly): link the
      cdylib + bindgen over the shipped headers
      (rs-sdk-ffi.h 4935 lines, platform-wallet-ffi.h 7679 lines,
      dash-network.h). You already ship reqwest+tokio; a build.rs
      bindgen step is standard. Slower to set up, zero Rust-API
      assumptions.

### 4.5 SPV + core balance (comes along for free)

    The same manager exposes SPV (nativeSpvStart/Stop/SyncProgress) and
    core balance (nativeGetCoreBalance) — desktop gets light-client
    core-wallet functionality without dashd. Mobile uses it for the
    shield-from-core flow; you need it for shield() source balances.

### 4.6 Test plan (mirrors mobile's verified flow)

    1. testnet identity with credits (faucet) + core tDASH
    2. warm_up_prover at launch; assert prover_is_ready before send UI
    3. shield(tDASH -> pool): balance visible after sync_now
    4. shielded_transfer to a second Orchard address (self-transfer OK)
    5. unshield (pool -> platform address), withdraw (pool -> core)
    6. kill app mid-sync; relaunch; assert note/tree resume from your
       persistence callbacks
    7. mainnet smoke ONLY after testnet full pass; shielded fees are
       real credits — keep amounts tiny (mobile used the minimum
       shielded fee via shielded_estimate_fee(2-input kind))

### 4.7 Gotchas mobile hit (so you don't)

    - ALWAYS use the trusted-context variants of SDK reads where the
      API offers them (EvoSDK.*Trusted(), trusted context provider in
      Rust) — untrusted quorum verification on mainnet fails with
      "invalid quorum: Quorum not found in cache" without prefetch.
    - Warm the prover EARLY; 10s on a button click reads as a hang.
    - Shielded state transitions broadcast via PLATFORM, not core —
      do not route them through your insight/dashswap paths.
    - Keep the mnemonic out of JS: pass it straight from your Rust
      keystore to the FFI call (mobile threads it through Kotlin
      without JS ever seeing it — you can do strictly better since
      signing happens in Rust).
    - The FFI result type carries structured errors (incl.
      ShieldedBroadcastFailed) — map them onto your DAPIError style.

---

## 5. Suggested sequencing

    Week 1: 2.2 endpoint cutover + 2.3 P0/P1 fixes + evo-sdk 4.x pin
             (sections 3.3 items 1-4)  => writes fully on DCG SDK
    Week 2: 3.3 items 5-7 (delete legacy SDKs) + DPNS/Yappr-profile
            polish lifted from mobile
    Week 3-4: section 4 shielded — Rust API spike (Option A), prover
              warmup, shield/unshield/transfer commands, minimal UI

## 6. Cross-team assets you can copy verbatim

    evonext-mobile/scripts/build-rsffi-android.sh
      (pinned commit, feature flags, profile, artifact sizes)
    evonext-mobile/android/app/src/main/jni/rsffi/*.h
      (full C ABI docs for every shielded function)
    evonext-mobile/android/.../rsffi/RsShieldedModule.kt + RsFfiModule.kt
      (call sequencing: manager -> configure -> wallet -> bind -> sync
      -> transact)
    evonext-mobile/src/services/UsernameService.ts, src/helpers/avatar.ts
      (DPNS reverse-resolution + DiceBear avatar pipeline)
    evonext-mobile/docs/HANDOFF.md
      (DAPI param contract details, posts write verification recipe)

Questions -> mobile team via sansbankdao Gitea issues on evonext-mobile.

---

## Progress Log (desktop team, appended)

### 2026-09-10 — tx-history foundation + stronghold spike

- **PR #6 MERGED** (`74658da`): transaction-history store — rusqlite 0.40
  (bundled) backend + typed commands (`history_list/upsert/count/clear`) +
  `src/types/history.ts` + `useTransactionHistory.ts`. Decision record:
  tauri-plugin-sql REJECTED (SQL-over-IPC violates Rust-side-logic
  convention); sqlx REJECTED (async stack + compile-time-query ceremony
  unjustified for local CRUD). 10 unit tests, 796 total. UI wiring is the
  follow-up PR.
- **Stronghold spike COMPLETE** (branch `spike/stronghold-keystore`,
  `spikes/stronghold/`, 4/4 proofs): in-vault secp256k1 works; Dash
  prehash sighash signing works via custom `UseSecret` procedure;
  existing plaintext keys import; snapshots encrypted + wrong-key
  rejected. DECISIONS LOCKED: encrypt everything (plaintext `.safu`
  storage retires); password NEVER required; key sourcing = OS keyring
  first, 0600-file fallback in headless setups. Engine maintenance is
  dormant (2.0.1/2.1.0, 2024-05-13) — yellow flag, mitigations in
  `docs/spikes/stronghold-keystore.md`. Integration PR prefers direct
  `iota_stronghold` dep over the plugin wrapper (no IPC surface).
- **v26.9.9 RELEASED** (linux x86_64: AppImage/deb/rpm + windows NSIS)
  built via the permanent evorunner pipeline; updater manifest live at
  `https://manifest.evonext.app/desktop`. macOS pending MacInCloud.

---

## Progress Log (2026-09-11): Tx-History Sync + Stronghold Keystore SHIPPED

**PR #7 (`b0e05a2`) — Transaction History sync wiring.** `src/stores/wallet/actions/historySync.ts`
is the single home for `ITransaction <-> TxRecord` mapping (signed amounts, direction, ms/s
timestamp normalization, rawJson full-fidelity embedding). `fetchRealTransactions` upserts every
Explorer-mapped tx into the SQLite cache (fire-and-forget) and **falls back to the local cache on
Explorer failure** (offline history works). Own sends (credits/tokens/withdrawals) record a
`pending` entry at broadcast with the REAL transition hash; the next sync upgrades in place.
12 unit tests; wallet suite 68/68.

**PR #8 (`d4b5b07`) — Stronghold encrypted keystore.** The plaintext `.safu-{network}.json`
vulnerability (private keys AND mnemonic on disk in cleartext) is RETIRED. Stronghold encrypted
snapshot behind the existing `PersistentStore` contract via `VaultStore` (safu files → vault,
everything else → legacy StoreManager). Key sourcing: OS keyring (keyring-rs 4) → 0600-file
fallback; password never required; lazy migration + shred on first access; `DashEcdsaPrehashSign`
ported from the spike (phase-2 in-vault signing, test-covered). Commands rewired with zero
frontend changes. Gates: 806/806 tests, fmt clean, 0 clippy issues in vault code.

**Phase 2 (documented, not started):** per-key guarded vault secrets + Rust-side transition
building so signing moves in-vault and key bytes stop transiting the JS runtime at all.
