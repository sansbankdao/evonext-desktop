# Spike: Stronghold Keystore (2026-09-10)

Branch: `spike/stronghold-keystore` · Code: `spikes/stronghold/` · Status: **CAPABILITY CONFIRMED**

Executable proof (`cargo test [--release]` in `spikes/stronghold/`): **4/4 pass** —

| # | Question | Result |
|---|----------|--------|
| a | In-vault secp256k1 ECDSA (generate / pubkey / sign)? | ✅ `builtin_secp256k1_roundtrip` |
| b | Raw 32-byte **prehash** (Dash sighash) signing? | ✅ via custom procedure — `custom_prehash_procedure_signs_exact_digest` |
| c | Import of EXISTING plaintext-keystore keys? | ✅ `existing_key_imports_and_signs` (pubkey matches k256 reference) |
| d | Encrypted at rest + reload + wrong-key rejection? | ✅ `snapshot_persists_encrypted_and_rejects_wrong_key` |

## Decisions locked by owner (2026-09-10)

1. **Encrypt everything. Plaintext key storage is retired as a supported mode.**
2. **A password is NEVER required** — not even in minimal/headless setups.
3. Snapshot-key sourcing, in preference order:
   - user opts into a password → derive key from it (strongest; portable);
   - default → random 32-byte key in the **OS credential store** (keyring-rs,
     Rust-side — no IPC, per project conventions);
   - keyring unavailable (headless Linux without Secret Service) → random
     32-byte key in a **0600 file** next to the snapshot. Honest obfuscation
     tier, labeled as such in the UI. Never silent plaintext.
4. Portability concern is mitigated by design: identity keys are
   **mnemonic-derived** — losing a machine's keyring means re-discovery,
   not loss. Onboarding's seed-backup step is the hard requirement.

## Technical findings

### F1. `Client::execute_procedure` is a CLOSED enum — use the `Runner` trait directly

`execute_procedure` requires `P: Into<StrongholdProcedure>` (crate-internal
enum). Custom procedures **cannot** go through it. However `Client`
publicly implements `procedures::Runner` (`src/procedures/clientrunner.rs:48`
in iota_stronghold 2.1.0), so calling `my_proc.execute(&client)` works and is
fully supported by the public API surface.

### F2. Built-in `Secp256k1EcdsaSign` cannot sign Dash digests

Only `Keccak256` / `Sha256` flavors — both hash internally. Dash signs
pre-computed double-SHA256 sighashes. The crypto layer underneath
(`iota-crypto` secp256k1 `SecretKey::try_sign_prehash([u8;32])`) supports raw
digests; the spike's `DashEcdsaPrehashSign` (~35 lines) bridges it as a
custom `UseSecret` procedure. This becomes app code in the integration PR.
Note: `iota-crypto`'s `[lib] name = "crypto"` (not `iota_crypto`).

### F3. Engine maintenance is DORMANT — yellow flag

| Crate | Latest | Released |
|-------|--------|----------|
| `stronghold_engine` | 2.0.1 | 2024-05-13 |
| `iota_stronghold` | 2.1.0 | 2024-05-13 |
| `tauri-plugin-stronghold` | 2.3.2 | 2026-08-31 |

The Tauri-org **plugin wrapper** is actively maintained; the IOTA **engine**
(security-critical core) has not shipped in ~28 months. Mitigations: pin
exact versions, wire `cargo audit` alerts, treat the vault as one layer of
defense (keys also never cross to the frontend), and keep the integration
surface small enough to swap engines if a CVE lands with no maintainer.

### F4. Snapshot commit latency

Debug 679s vs **release 12.14s** for the full 4-test suite (~2–3s per
snapshot commit in release — memory-hard KDF is intentionally expensive and
brutally deoptimized in debug). Integration rule: **commit snapshots in the
background / debounced**, never synchronously on the key-write path.

### F5. Migration path is trivial

`client.vault(vault_path).write_secret(location, Zeroizing<Vec<u8>>)`
imports a raw 32-byte key. Migration flow for the integration PR:
read `.safu-{network}.json` → for each key, write into vault at
`identity/{identityId}/key/{keyId}` → commit snapshot → securely delete
(shred) the plaintext file → mark migration complete in settings.

## Integration sketch (next PR, not this spike)

- `src-tauri/src/vault/` module: `KeySource` enum (Password | Keyring |
  FallbackFile), snapshot-key provisioning, `DashEcdsaPrehashSign`,
  migration from `identity/storage.rs`'s keystore.
- Signing call-sites (identity/asset commands) swap key-bytes-for-sign with
  in-vault procedure execution — keys stop existing as plain `Vec<u8>` in
  our process entirely.
- The `tauri-plugin-stronghold` wrapper is OPTIONAL — we can depend on
  `iota_stronghold` directly (Rust-side only, no IPC surface). Prefer
  direct dependency; the plugin adds a frontend-accessible boundary we do
  not want.
