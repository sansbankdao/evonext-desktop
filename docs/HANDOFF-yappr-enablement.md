<!-- docs/HANDOFF-yappr-enablement.md -->

# Handoff: Enabling Yappr in EvoNext Desktop

**Audience**: EvoNext Desktop team (Tauri + Vue 3 + Pinia)
**Author**: EvoNext Mobile session 2026-09-09
**Status**: Every contract ID, field name, and query rule below was
**verified LIVE against `https://dapi.sansbank.dev/v1/dapi` on 2026-09-09**
(not copied from docs or headers — docs lie; the network does not).

---

## 1. What "enable Yappr" means

Yappr is a third-party social app on Dash Platform (upstream repo:
`github.com/pastapastapasta/yappr`; the Sansbank-operated deployment is
the `evonext.app` fork). Its posts and profiles live in PUBLIC data
contracts — any client that knows the contract IDs and query rules can
read and render the feed, and any identity with credits can write posts
that Yappr's own UI will display.

EvoNext Mobile shipped a full Yappr feed (read + write) in v26.9.x.
This document is the complete transfer of everything needed to reach
parity in `evonext-desktop`, including four verified integration bugs
already present in the desktop codebase.

## 2. Executive summary of desktop's current state

Desktop ALREADY has: `src/screens/Posts.vue`, `src/stores/posts/`,
`src/services/posts/`, a correct Rust DAPI transport
(`src-tauri/src/dapi/client/base.rs` — canonical param keys, null
omission, correct endpoint), and the correct posts contract ID in
`src/constants/index.ts:22`. The social tab is gated to testnet by
`isSocialAvailable` (`src/screens/Posts.vue:488`), which is CORRECT
(there is no mainnet Yappr contract — see §3).

What is missing/broken (details + fixes in §6):

1. Yappr PROFILE lookups query the posts contract — profiles resolve
   but WITHOUT avatars (wrong contract, wrong field names).
2. The avatar pipeline cannot parse Yappr's DiceBear `avatar` field,
   and the fallback leaks identity IDs to `api.dicebear.com`.
3. Post content is rendered raw — Yappr's Phase A rich text
   (bold/italic/code/@mention/#hashtag/$cashtag/URLs) is not parsed.
4. Dead mainnet ternary + `'TBD'` mainnet contract constant.

---

## 3. Authoritative contract registry (live-verified 2026-09-09)

| Contract | Testnet | Mainnet |
|---|---|---|
| Yappr posts | `AyWK6nDVfb8d1ZmkM5MmZZrThbUyWyso1aMeGuuVSfxf` | **NONE** |
| Yappr unified profile | `FZSnZdKsLAuWxE7iZJq12eEz6xfGTgKPxK7uZJapTQxe` | **NONE** |
| DPNS | `GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec` | same id |
| DashPay | `Bwr4WHCPz5rFVAD87RqTs3izo4zpzwsEdKPWUT1NS1C7` | same id |

Sources: `evonext.app/lib/constants.ts:44-45`
(`YAPPR_CONTRACT_ID_MAINNET = ''` — never deployed),
`evonext.app/lib/constants.ts:23` (DPNS both networks),
`evonext-mobile/src/stores/PostsStore.ts:16-40`.

**⚠️ THE EWR695 TRAP**: the upstream yap.pr repo HEAD defaults to
`EWR695MsqPUuW8EnTbYzD4KybNQD5n7CUDWydJYNg63F` ("Testnet - v10",
upstream `lib/constants.ts:6`). It is LIVE but STALE and UNUSABLE for
a feed client:

- Unordered queries return posts (last activity ~2026-02).
- `orderBy: [["$createdAt","desc"]]` returns **EMPTY** (verified) —
  its index configuration does not serve timeline queries.
- The ecosystem standard (evonext.app, evonext-mobile, the push
  watcher) is `AyWK6nD…`: 100+ posts, newest 2026-09-08 (verified).

DO NOT copy contract IDs from the upstream yap.pr repo.

---

## 4. Deployed document schemas (live-verified field lists)

Documents carry only the fields that were SET at creation time, plus
system fields (`$id`, `$ownerId`, `$createdAt`, `$updatedAt`,
`$revision`, `$dataContractId`, `$type`, block-height fields).
`$createdAt`/`$updatedAt` are **milliseconds epoch** (u64 — use 64-bit
types in Rust; JS `number` is safe).

### 4.1 Yappr `post` (contract `AyWK6nD…`, testnet)

Always present: `content` (string), `language` (string, e.g. `'en'`).
Optional (upstream schema `contracts/yappr-social-contract.json`):
`mediaUrl`, `replyToPostId`, `quotedPostId`, `firstMentionId`,
`primaryHashtag`, `sensitive`.
A repost is a `post` with `quotedPostId` set and empty content.

Indexes (from the live index-validation error, §5): `ownerAndTime`
[$ownerId asc, $createdAt asc], `timeline` [$createdAt],
`replyToPost` [replyToPostId, $createdAt]. **`language` is NOT
indexed** (there is no `languageTimeline` index on this contract).

### 4.2 Yappr unified `profile` (contract `FZSnZdKs…`, testnet)

Live-verified fields: **`displayName`** (string), **`avatar`** (string).

`avatar` is either:
- a DiceBear JSON string: `{"style":"bottts","seed":"xyz"}` — the
  style must be resolved through Yappr's style map (§7.4); or
- a direct image URI: `http(s)://…` or `ipfs://…`.

There is NO `avatarUrl`, NO `publicMessage`, NO `bio` on this contract.

### 4.3 Embedded legacy `profile` on the POSTS contract (`AyWK6nD…`)

Live-verified fields: `displayName`, `bio`. **NO avatar field.**
This is a legacy artifact — it is what desktop's current Yappr-profile
query returns today, which is exactly why desktop avatars never
resolve. Do not use it as an avatar source; the unified profile
contract (§4.2) is authoritative.

### 4.4 DashPay `profile` (contract `Bwr4WHC…`, both networks)

Live-verified fields: `displayName`, `avatarUrl`, `publicMessage`,
`avatarHash`, `avatarFingerprint`. (Mobile defensively also reads
lowercase variants `displayname`/`avatarurl`/`publicmessage` — older
docs exist in both casings.) Use as the LEGACY fallback only.

### 4.5 DPNS `domain` (contract `GWRSAV…`, both networks)

Fields: `label` (the username, no `.dash` suffix), `normalizedLabel`,
`records.identity` (owner identity id). Unique (contested/voted) names
additionally carry `records.dashUniqueIdentityId`; aliases carry
`records.dashAliasIdentityId`. One identity can own several names —
sort contested-first before picking (§7.3).

---

## 5. Query rules (every rule below was probed live)

Transport: `POST https://dapi.sansbank.dev/v1/dapi` with body
`{"method": "get_documents", "params": {...}, "network": "testnet"}`.

Canonical `get_documents` params (object form):
`dataContractId`, `documentType`, `whereClause`, `orderBy`, `limit`,
`startAfter`, `startAt`. Rules:

- **Omit null/empty clauses entirely** — an explicit null
  `whereClause`/`orderBy` fails validation. Desktop's Rust client
  already does this (`shape_params_for_wire`,
  `src-tauri/src/dapi/client/base.rs:117-142`). KEEP IT.
- The legacy positional array form is REJECTED for `get_documents`
  (proxy contract since 2026-09-08). Desktop's Rust client shapes
  positionals into the canonical object — verified correct.
- Stringified arrays (`"whereClause": "[[...]]"`) are TOLERATED by the
  proxy (verified), and raw arrays work (verified). Standardize on raw
  arrays; desktop currently mixes both (`fetching.ts` stringifies for
  posts, passes raw arrays for profiles/DPNS) — harmless but confusing.
- **Send a non-bot User-Agent.** Cloudflare in front of the proxy
  returns `403 error code: 1010` for bot signatures (verified with a
  Python-urllib UA). curl/browser/app UAs pass.
- When `orderBy` includes `$createdAt` and no range clause is given,
  the proxy injects `$createdAt > 0` server-side.
- `startAfter` (document-ID cursor) is honored by the proxy.

### 5.1 Timeline feed (THE query that works)

    {
      "method": "get_documents",
      "params": {
        "dataContractId": "AyWK6nDVfb8d1ZmkM5MmZZrThbUyWyso1aMeGuuVSfxf",
        "documentType": "post",
        "orderBy": [["$createdAt", "desc"]],
        "limit": 20
      },
      "network": "testnet"
    }

- NO `whereClause`. Uses the `timeline` index.
- **`whereClause: [["language","==","en"]]` FAILS** (verified):
  `where clause on non indexed property error: query must be for valid
  indexes, valid indexes are: {"ownerAndTime": …, "timeline": …,
  "replyToPost": …}`. Filter `language` client-side if needed.

### 5.2 Posts by one author (profile pages)

Uses `ownerAndTime`: `whereClause: [["$ownerId","==","<id>"]]`,
`orderBy: [["$createdAt","desc"]]`.

### 5.3 Replies to a post

Uses `replyToPost`: `whereClause: [["replyToPostId","==","<postId>"]]`,
`orderBy: [["$createdAt","asc"]]`.

### 5.4 Yappr profile lookup (per author)

    {
      "dataContractId": "FZSnZdKsLAuWxE7iZJq12eEz6xfGTgKPxK7uZJapTQxe",
      "documentType": "profile",
      "whereClause": [["$ownerId", "==", "<identityId>"]],
      "limit": 1
    }

`orderBy` omitted (or `[["$ownerId","desc"]]` — verified tolerated).
Identity IDs are base58 in where clauses.

### 5.5 DashPay profile lookup (legacy fallback)

`whereClause: [["$ownerId","==","<id>"]]`,
`orderBy: [["$updatedAt","desc"]]`, `limit: 1`.

### 5.6 DPNS reverse-resolution (identity id → username)

    {
      "dataContractId": "GWRSAVFMjXx8HpQFaNJMqBV7MBgMK4br5UESsB4S31Ec",
      "documentType": "domain",
      "whereClause": [["records.identity", "==", "<identityId>"]],
      "limit": 10
    }

**`orderBy` MUST be omitted** — the `records.identity` indexes contain
no sortable second field; any orderBy fails validation (mobile
verified 2026-09-08). Desktop's `fetchDPNSName` already omits it — KEEP.

### 5.7 Pagination

Proxy tier honors `startAfter: "<lastDocId>"`. Desktop's
`fetchMorePostsAction` currently ignores cursors (offset is
client-side only) — functional but re-fetches the head; recommend
passing `startAfter` once the feed works.

---

## 6. Desktop integration bugs (verified against your sources + live network)

### BUG 1 — Yappr profiles queried on the wrong contract

`src/stores/posts/actions/fetch.ts:176-186` queries `profile` documents
against `YAPPR_CONTRACT_ID_TESTNET` (the POSTS contract). Live probe:
that contract DOES have an embedded legacy `profile` type — it returns
`displayName` + `bio` and **no avatar field** (§4.3). So the lookup
succeeds silently while avatars can never resolve.

FIX: add to `src/constants/index.ts`:

    export const YAPPR_PROFILE_CONTRACT_ID_MAINNET = ''
    export const YAPPR_PROFILE_CONTRACT_ID_TESTNET = 'FZSnZdKsLAuWxE7iZJq12eEz6xfGTgKPxK7uZJapTQxe'

and point the profile lookup at it (guard: skip when the network's id
is empty).

### BUG 2 — Avatar pipeline reads fields that do not exist

`src/services/posts/transformers.ts:24-25` reads
`yapprProfile?.avatarUrl` and `yapprProfile?.publicMessage`. The Yappr
unified profile has **`avatar`** and **`displayName`** ONLY (verified
§4.2); `avatarUrl`/`publicMessage` exist solely on DASHPAY profiles
(§4.4). `avatar` must be parsed: DiceBear JSON string
(`{"style":"bottts","seed":"xyz"}`) or direct/ipfs URI (§7.4).

### BUG 3 — Avatar fallback leaks identity IDs to a third party

`src/services/posts/transformers.ts:11` builds
`https://api.dicebear.com/7.x/identicon/svg?seed=<ownerId>` — a network
dependency that also discloses every author's identity ID to
dicebear.com. Mobile generates the SVG LOCALLY with
`@dicebear/core` + `@dicebear/collection` (zero network, deterministic,
identical output to Yappr). Port `evonext-mobile/src/helpers/avatar.ts`
(§7.4) — it is pure TS with no React Native dependencies and drops into
a Vite/Vue app unchanged (add the two dicebear deps).

### BUG 4 — Dead mainnet handling

`src/constants/index.ts:21` has `YAPPR_CONTRACT_ID_MAINNET = 'TBD'`,
and `fetch.ts:179-180` is a dead ternary
(`testnet ? YAPPR_CONTRACT_ID_TESTNET : YAPPR_CONTRACT_ID_TESTNET`).
There IS no mainnet Yappr contract (§3). Make the mainnet constant `''`
and short-circuit to a graceful empty feed when the active network has
no contract (mobile pattern: `PostsStore.fetchPosts` → empty state, no
error). `isSocialAvailable` already gates the UI to testnet — keep it.

### Minor issues (not blockers)

- **Dedupe key collision**: `fetch.ts` dedupes on
  `${ownerId}-${createdAt}` — two posts by one author in the same
  millisecond collapse. Use `$id`.
- **Display priority inverted vs Yappr**: `getUserInfo` prefers the
  DashPay `displayName` over the Yappr one. Yappr's own
  `resolve-user-details` (and mobile) use: Yappr profile displayName →
  @username → `User <first6 of identityId>`. Align (§7.5).
- **Naming**: `getUserInfo`'s `dpnsProfile` parameter is actually the
  DASHPAY profile; `verified: !!dpnsName` ties the checkmark to DPNS
  ownership. Cosmetic, but rename while you are in there.
- **No create-post path to Yappr**: `src/services/posts/mutations.ts`
  exists; ensure its target contract + properties match §8 when writes
  are enabled.

### Verified NON-bugs (do not "fix" these)

- Stringified `whereClause`/`orderBy` in `fetching.ts` — the proxy
  tolerates both string and array forms (verified). Standardize for
  clarity only.
- `orderBy: [["$ownerId","desc"]]` on the profile query — tolerated
  (verified).
- The Rust DAPI client (`base.rs`, `methods/documents.rs`) — canonical
  keys, null omission, endpoint, response cache: all correct.
- `ensureBase58` base64→base58 conversion — keep it; some evo-sdk
  paths hand you base64 IDs.

---

## 7. Reference implementation map (port from evonext-mobile)

All paths are in `/Workspace/sansbank/evonext-mobile` (Gitea:
`sansbankdao/evonext-mobile`, master ≥ `e1c3162`). Files marked PURE TS
have zero React Native dependencies and can be copied verbatim.

### 7.1 Feed orchestration — `src/stores/PostsStore.ts`

Port the STRUCTURE, not the MobX (desktop uses Pinia):

- `CONTRACT_IDS` / `YAPPR_PROFILE_CONTRACT_IDS` per-network maps with
  `null` mainnet → graceful empty feed (§3).
- `POSTS_WHERE`: testnet `null` (§5.1). The `mainnet: [['language','==','en']]`
  entry is historical knowledge about a contract that was never
  deployed — ignore it.
- `profileCache: Map<ownerId, IAuthorProfile | null>` — **null is a
  cached negative**, preventing re-fetch storms on every scroll.
- `fetchProfiles(ownerIds)` — three failure-tolerant lookups per
  author: Yappr unified profile → DPNS username → DashPay profile.
  Failures are logged, never block rendering; partial results are still
  cached.
- Two-phase render: map posts immediately with fallback avatars
  (fast paint), then `refreshPostProfiles()` re-maps once profiles
  land. This is what makes the feed feel instant.
- `createPost` — see §8.

### 7.2 Fetch fallback chain — `src/services/DashQtService.ts`

Mobile runs three tiers: dapi.sansbank.dev → native Rust SDK → WASM
bridge. Desktop's Rust `DAPIClient` IS tier 1 and is correct. If you
want resilience later, mobile's tier-2 wire format differs from DAPI
(`src/services/NativeDocumentsService.ts` header comment documents the
`[{field,operator,value}]` clause shape and the
`{"documents":[…],"total_count":N}` envelope) — only relevant if you
adopt rs-sdk-ffi; not required for Yappr parity.

### 7.3 DPNS service — `src/services/UsernameService.ts` (near-pure TS)

- Reverse-resolution query (§5.6), orderBy MUST be null.
- Contested-first sort: docs with `records.dashUniqueIdentityId` sort
  before aliases (port of Yappr's `sortUsernamesByContested`).
- TTL cache: 5 min positive / 1 min negative; **never cache failures**
  (transient errors must not stick).
- Read `doc.label ?? doc.$label` (DAPI flattens, other tiers may not).

### 7.4 Avatars — `src/helpers/avatar.ts` (PURE TS, port verbatim)

- `STYLE_MAP`: 29 DiceBear styles mirroring Yappr's styleMap — profile
  `style` values render identically across clients.
- `generateAvatarSvg(style, seed)`: local `createAvatar(...).toString()`
  with a 500-entry FIFO cache; unknown styles fall back to `thumbs`.
- `parseAvatarField(avatarField, identityId)`: URI (incl. `ipfs://` →
  `https://ipfs.io/ipfs/` gateway) → DiceBear JSON → deterministic
  fallback `thumbs` seeded by the identity ID.
- `resolveAuthorAvatar(yapprAvatar, dashpayAvatarUrl, identityId)`:
  the full priority chain.
- Deps to add: `@dicebear/core`, `@dicebear/collection`.
- Render: inline the SVG string (Vue: `v-html` in a sized container, or
  a data-URI `<img>`); URIs go to `<img src>`.

### 7.5 Content parser — `src/helpers/postContent.ts` (PURE TS, port verbatim)

Yappr Phase A rich text, regexes ported 1:1 from upstream
`components/post/post-content.tsx`:

- Formatting (checked first): `**bold**`, `*italic*`, `` `code` ``.
- Inline: URLs (`http(s)://`, `ipfs://`, `www.`), `#hashtag`,
  `$cashtag`, `@mention` (optional `.dash` suffix).
- Overlap resolution: sort by position, longer match wins on ties
  (bold beats italic), first match wins; formatting segments recurse
  into inline parsing for their children.
- Output: `PostContentPart[]` ({type, value, children?}) — render each
  type with its own Vue sub-component/styles.

### 7.6 Display rules (from mobile `mapDocumentToPost` + upstream `lib/utils/resolve-user-details.ts`)

- author: Yappr displayName → `@username` → `User <first6 of ownerId>`
- handle: `@username` → `@<first8 of ownerId, lowercased>`
- avatar: Yappr `avatar` field → DashPay `avatarUrl` → DiceBear
  `thumbs` seeded by ownerId
- timestamp: relative `Ns` / `Nm` / `Nh` / `Nd` from `$createdAt`
- Mobile currently mocks likes/comments counts — do the same or wire
  `like` documents later; do NOT block the feed on them.

---

## 8. Writing posts (createPost)

Reference: `evonext-mobile/src/stores/PostsStore.ts` `createPost` +
`src/helpers/platform.ts` `deriveWifForPurpose`.

Rules:

1. Validate: `content.trim()` non-empty, **≤ 500 characters** (contract
   constraint — Yappr enforces the same).
2. Document properties: `{ content: <trimmed>, language: 'en' }`
   (the contract has no required `language` index on testnet, but
   Yappr's UI and future mainnet indexes expect the field).
3. Signing key: the identity's **AUTHENTICATION** key at security level
   **CRITICAL or HIGH**. The key INDEX is not static — resolve it
   dynamically:
   a. fetch the identity;
   b. find the first publicKey whose purpose is AUTHENTICATION
      (accept string `'AUTHENTICATION'` OR numeric `0`) and level
      CRITICAL(1)/HIGH(2);
   c. its array index → HD path
      `m/9'/<5 mainnet|1 testnet>'/5'/0'/0'/<identityIdx>'/<keyIndex>'`;
   d. derive the WIF from the mnemonic at that path.
4. Submit `documentCreate` with `{ dataContractId, documentTypeName:
   'post', ownerId, properties, privateKeyWif, keyId: <keyIndex> }`.
5. Re-fetch the feed; the post appears immediately (testnet writes
   confirmed live: the 2026-09-08 "EvoNext mobile testnet write test"
   post was written by exactly this flow).

Crypto/key derivation MUST stay in-process (desktop already has
`dash-platform-sdk` / `@dashevo/evo-sdk` — use them, never a remote
signing API).

---

## 9. Push notifications (server side already exists)

`evonext-manager/src/manageYapprPosts.js` (deployed cron worker):

- Polls the posts contract (§5.1 query, limit 10) every tick.
- Checkpoint `yappr:lastCreatedAt` in KV; **first run seeds the
  checkpoint WITHOUT sending** (no backlog blast).
- Checkpoint advances BEFORE sending (failures never re-blast).
- Fans out to every row in the D1 `push_devices` table via Pushy;
  single post → 100-char snippet, multiple → "N new posts on Yappr".

Desktop needs nothing for the server side. When desktop wants push:
register a device token through `POST /v1/push/register` on
`api.evonext.app` (see `evonext-mobile/src/services/PushRegistrationService.ts`;
D1 migration for `push_devices` is the one outstanding infra task —
track with the mobile team).

---

## 10. Verification checklist (run these exact probes)

Prerequisite: any HTTP client with a non-bot User-Agent (§5).

    UA="Mozilla/5.0 EvoNextDesktop/26.x"
    U=https://dapi.sansbank.dev/v1/dapi

1. Timeline: §5.1 body → `success:true`, 20 docs, fields include
   `content`,`language`,`$createdAt`,`$ownerId` (verified 2026-09-09).
2. Language filter rejection: add
   `"whereClause":[["language","==","en"]]` → `success:false`,
   "where clause on non indexed property" (verified).
3. Yappr profile: §5.4 with a known author → fields `avatar`,
   `displayName` (verified).
4. Posts-contract profile (the bug-1 trap): same query against
   `AyWK6nD…` → returns docs with `bio`,`displayName`, NO `avatar`
   (verified — this is the wrong-contract tell).
5. EWR695 trap: §5.1 body against `EWR695MsqPUuW8EnTbYzD4KybNQD5n7CUDWydJYNg63F`
   → `success:true` with `result:[]` (verified).
6. DPNS reverse: §5.6 → docs with `label`, `records.identity`
   (verified; one identity may return several labels).

UI acceptance: feed renders on testnet; author names resolve
(displayName or @username); DiceBear avatars render OFFLINE (disable
network and confirm); `**bold**`/`*italic*`/`@mention`/`#hashtag`
styled; mainnet shows the graceful empty state; create-post lands on
chain and appears after refresh.

---

## 11. Gotchas & traps appendix

- **`$createdAt` width**: ms epoch exceeds u32/f32 — mobile lost a
  session to a 32-bit truncation. Rust: `u64`/`f64`. JS: `number` is
  fine.
- **Base64 vs base58 IDs**: evo-sdk internals sometimes hand you base64
  IDs (44 chars ending in `=`). Desktop's `ensureBase58` handles it —
  keep it on every id entering a where clause.
- **Cloudflare 1010**: bot-signature UAs are banned at the edge. Send
  an app/browser UA from Rust (`reqwest` sends none by default — that
  passes today, but set one explicitly to be safe).
- **`data_contract_fetch` returns `{}`** through the proxy (schema is
  not serialized) — you cannot introspect contracts via
  dapi.sansbank.dev; verify empirically with `get_documents` instead.
- **Optional fields are absent, not null**: `replyToPostId` etc. are
  missing keys when unset — use optional chaining everywhere.
- **Feed cache staleness**: the Rust `DAPIClient` has a 200-entry
  response cache keyed on method+params+network. Timeline queries are
  time-sensitive — consider bypassing/expiring the cache for
  `get_documents` on the posts contract, or pull-to-refresh will
  replay stale pages.
- **Two live testnet contracts** (§3): if a teammate points the app at
  the upstream yap.pr repo's default ID, the feed silently empties.
  Comment `YAPPR_CONTRACT_ID_TESTNET` as the evonext.app deployment id.

## 12. Decisions the desktop team owns

1. **Dual-contract merge**: `getActivePostContracts('testnet')`
   returns BOTH the EvoNext and Yappr contracts (merged feed, deduped,
   sorted client-side). Keep the merge (note the `$id` dedupe fix in
   §6) or split into tabs — product call.
2. **Source badge**: with a merged feed, consider rendering a
   "via Yappr" badge on Yappr-contract posts (`$dataContractId` is on
   every doc).
3. **DiceBear local vs remote**: this handoff recommends LOCAL
   generation (privacy + offline). If you keep remote URLs, at minimum
   stop seeding them with raw identity IDs.
4. **Mainnet posture**: Yappr has never deployed a mainnet contract;
   `isSocialAvailable` testnet-gating is correct today. When upstream
   ships mainnet, add the ID + re-check §5.1 (the deferred mainnet
   schema DID require a `language` equality filter — that historical
   note lives in mobile's `POSTS_WHERE`).

## 13. Source index

- Mobile implementation (the parity target):
  `/Workspace/sansbank/evonext-mobile/src/stores/PostsStore.ts`,
  `src/services/{DashQtService,UsernameService,NativeDocumentsService}.ts`,
  `src/helpers/{avatar,postContent,platform}.ts`,
  `src/types/social.ts`, `src/components/post/*`.
- Upstream Yappr repo (reference only — do NOT copy contract IDs):
  `/tmp/yappr-review` (github.com/pastapastapasta/yappr @ f42ce65),
  esp. `lib/constants.ts`, `lib/services/avatar-generator.ts`,
  `lib/utils/resolve-user-details.ts`,
  `components/post/post-content.tsx`, `lib/services/dpns-service.ts`,
  `contracts/yappr-social-contract.json`.
- Sansbank Yappr deployment (authoritative IDs):
  `/Workspace/sansbank/evonext.app/lib/constants.ts`.
- Push watcher: `/Workspace/sansbank/evonext-manager/src/manageYapprPosts.js`.
- Proxy contract details: `/Workspace/sansbank/dev-dapi-proxy/docs/HANDOFF-mobile-app-integration.md`.

*Handoff written 2026-09-09. All "verified" claims were executed
against dapi.sansbank.dev on that date; re-run §10 probes if the
network answers ever disagree with this document — the network wins.*
