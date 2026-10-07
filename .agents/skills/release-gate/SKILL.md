---
name: release-gate
description: >
    HARD GATE for any release action in evonext-desktop. A "release action" is
    ANY of: version bump (package.json, tauri.conf.json, Cargo.toml,
    Cargo.lock), git tag creation (vX.Y.Z), git push to origin (master or
    tags), or re-running the release workflow. This skill loads BEFORE
    performing any of those and enforces explicit user sign-off. Derived from
    the evonext-mobile release-gate skill, which exists because an agent
    auto-released v26.9.15 without instruction. NEVER auto-release.
---

# release-gate — Release Authorization Gate (evonext-desktop)

> **Discovery note.** This skill lives at `.agents/skills/release-gate/SKILL.md`,
> which pi only scans for a **trusted** project. As of 2026-09-22
> `/Workspace/sansbank/evonext-desktop` was NOT in `~/.pi/agent/trust.json`,
> so pi will not auto-load it. Trust the project, or reference this path
> explicitly. Until then, treat this file as documentation to be read on
> demand, not as an always-on gate.

## 🛑 STOP — A RED GITHUB ACTIONS RUN IS *NOT* A RELEASE BLOCKER

If you pushed a tag and the `Release EvoNext Desktop Edition` workflow run
failed in 4-10 s (or the `CI Suite` is red), **that is EXPECTED and
HARMLESS.** It is the billing hold killing GitHub-*hosted* runners — it has
NOTHING to do with shipping.

**Do NOT, under any circumstances, do any of the following in response to a
red/failed Actions run:**
- conclude the release is "blocked by billing" and stop to ask the user, or
- propose / start rewiring `release.yml` `runs-on:` to move `create-release`
  or `publish-release` onto `evorunner`, or
- treat the Actions failure as the build failing.

The build is `ssh evorunner '~/builds/evonext-desktop-release.sh vX.Y.Z
--windows'` — full stop. It does not touch GitHub Actions. GitHub only
provides two **free** services here: the git remote and `gh release
upload`. Neither is billing-blocked. If you find yourself reasoning about
the CI failure while trying to release, you have gone down the WRONG PATH —
go to "HOW RELEASES ACTUALLY SHIP" below and run the script.

> This rule was added after an agent (v26.10.7) pushed the tag, saw the
> instantly-failed CI run, and wrongly reported the release as
> "blocked by billing", offering to rewire the workflow — wasting a turn.
> The tag push working + CI failing is the NORMAL state of every release
> since v26.9.13.

## ⛔ READ THIS BEFORE ANY RELEASE ACTION

A "release action" is any of:
- Editing `version` in `package.json`, `src-tauri/tauri.conf.json`,
  `src-tauri/Cargo.toml`, or the `evonext` entry in `src-tauri/Cargo.lock`
- `git tag vX.Y.Z`
- `git push origin master` or `git push origin vX.Y.Z`
- Re-running the release workflow (any mechanism)
- Editing `CHANGELOG.md` as release prep

## THE RULE (NON-NEGOTIABLE)

**Do NOT perform ANY release action without an explicit, unambiguous
instruction from the user for THIS specific release.**

Valid instruction:
- "Release this as v26.9.22"
- "push 26.9.21"
- "Cut release v26.9.22"

INVALID (must NOT trigger a release):
- A user request to fix/change/implement something (even if it "feels done")
- A prior release that "needs a follow-up"
- "While I'm here I'll just ship it"
- "The change is small, no need to bother the user"
- ANY internal reasoning that "a release would be appropriate"

If unsure whether the user wants a release: **STOP and ASK.** Never assume.

## CHECKLIST — run before EVERY release action

Answer each OUT LOUD in your response and STOP if any answer is not a clear YES:

1. Did the user explicitly request a release in this turn or a recent turn?
   Cite the exact user words.
2. Did the user specify a version number? If not, do NOT invent one. Ask.
3. Has the user signed off on the version number specifically?
4. Has the user been told the build burns ~20-30 min on evorunner, and that
   GitHub-hosted jobs are billing-blocked (CI will be red, and that is
   harmless)?
5. Has the user been told the release will be published manually via
   `gh release create/upload/publish`, and that **macOS artifacts cannot be
   produced** (ship Linux + Windows)?
6. Is this version name NEW — never tagged before, and never built before
   under this same name? (See "NEVER RELEASE THE SAME VERSION NAME TWICE".)

If ANY answer is NO or "I inferred it": DO NOT RELEASE. State the gap and wait.

## 🔑 HOW RELEASES ACTUALLY SHIP — `~/builds/evonext-desktop-release.sh` on evorunner

**This is the single most important fact in this document.** Releases have
shipped continuously (v26.9.9 → v26.9.16, and v26.10.7) DESPITE every
GitHub Actions run failing. **GitHub Actions is NOT the release mechanism.
It never was, for any release since at least v26.9.11.**

The real builder is a shell script on the evorunner host:

    ssh evorunner '~/builds/evonext-desktop-release.sh vX.Y.Z --windows'

It does not use CI in any way. The billing hold is **irrelevant to
releasing** — it only explains the red CI badge. Do not tell the user a
release is blocked by billing. It is not.

### Why the billing hold does not matter here

The hold blocks **GitHub-hosted runners** only. It does NOT affect:
- GitHub as a git remote (`git clone` / `git fetch` — free, unaffected)
- GitHub as an asset host (`gh release upload` — free, unaffected)

The build host is your own VPS, so it has no GitHub dependency beyond those
two free services.

### What the release script does (84 lines, re-read it before relying on this)

    ssh evorunner 'cat -n ~/builds/evonext-desktop-release.sh'

1. **Clones the tag itself** (line 37):
   `git clone --depth 1 --branch "$TAG" https://github.com/sansbankdao/evonext-desktop.git`
   If `~/builds/evonext-release/.git` exists it does `git fetch --depth 1
   origin tag "$TAG" -f && git checkout -q FETCH_HEAD` (lines 33-35).
2. **Sources signing keys** (line 30): `~/.config/evonext-signing/env`
   (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`).
3. **Linux** — inside the `evobuild:22.04` container (lines 41-49), pinned
   to glibc 2.35 so AppImages run on older distros:

       pnpm install --no-frozen-lockfile && pnpm type:gen && pnpm tauri build --features realtime --verbose && bash /gio-fix.sh

   `--features realtime` is ALREADY present in the script.
4. **Windows** — cross-built on the HOST via `cargo-xwin`
   (`--windows` flag required, lines 51-76):

       SODIUM_LIB_DIR=$HOME/builds/libsodium-msvc/... \
       PATH="$HOME/builds/cargo-shim:$PATH" \
         npx -y pnpm@8 tauri build --config '{"build":{"beforeBuildCommand":""}}' \
           --features realtime --target x86_64-pc-windows-msvc --bundles nsis --verbose

5. **Prints artifact paths** (lines 79-81); it does NOT upload.

### Required support files on evorunner (all verified present 2026-09-22)

| Path | Purpose |
|---|---|
| `~/builds/evonext-desktop-release.sh` | the builder |
| `~/.config/evonext-signing/env` | minisign/ed25519 updater signing key |
| `~/builds/cargo-shim/cargo` | routes `cargo build` through `cargo xwin` |
| `~/builds/libsodium-msvc/libsodium/x64/Release/v143/static/libsodium.lib` | prebuilt MSVC static libsodium |
| `~/builds/appimage-gio-fix.sh` | AppImage gio module bundling fix |
| `~/builds/Dockerfile.evobuild` | source for the `evobuild:22.04` image |
| `evobuild:22.04` docker image (2.85 GB) | the Linux build container |
| `~/builds/target-22.04` (9.6 GB) | cached Linux CARGO_TARGET_DIR |
| `~/builds/evonext-release` | the cloned work tree |

The `cargo-shim` is required because without it `tauri build --target
x86_64-pc-windows-msvc` calls real `cargo build`, and cc-rs spawns clang
with `--target=...` but no SDK include paths → `fatal error: 'stdlib.h'
file not found`. The shim sets INCLUDE/LIB/CC via cargo-xwin.

### Uploading is a SEPARATE manual step (from THIS dev box)

Script line 22 documents it:

    gh release upload <tag> --clobber <files...>

Artifacts are staged to `~/builds/vX.Y.Z/` on the dev box first, then
uploaded. **v26.9.16's assets were uploaded by user `nyusternie`, NOT
`github-actions[bot]`** — that is the fingerprint of this manual path.

**`gh` here has NO `release publish` subcommand.** To flip a draft public,
use `gh release edit <tag> --draft=false`.

### KNOWN SCRIPT DEFECT — `git checkout` without `-f` (FIXED 2026-09-22)

The container runs `pnpm install` as **root**, which rewrites the mounted
`pnpm-lock.yaml`. That leaves the work tree dirty, and the script's
`git checkout -q FETCH_HEAD` (line 35) then **aborts**:

    error: Your local changes to the following files would be overwritten by checkout: pnpm-lock.yaml

This makes the script **fail on its second and every later run**. It bit
v26.9.21 immediately after v26.9.16. Fixed by adding `-f`:

    git -C "$WORK" checkout -q -f FETCH_HEAD

A backup lives at `~/builds/evonext-desktop-release.sh.bak-<timestamp>`.
If a future run aborts with that error, confirm `-f` is still present.
(The untracked `.pnpm-store/` in the work tree is harmless.)

### Consequence: the three-platform story is NOT a CI story any more

The `release.yml` workflow still describes GitHub-hosted jobs. It is
**vestigial for Linux+Windows** — the script already builds those two
platforms without it. What the workflow still uniquely provides is:

| Job | Still needed? |
|---|---|
| `create-release` (draft + CHANGELOG body) | **Yes** — but the script does not do it; must be done manually |
| `build-linux` | No — script does it in `evobuild:22.04` |
| `build-macos` | **Only source of macOS artifacts.** It is billing-blocked. |
| `build-windows` | No — script cross-builds NSIS via cargo-xwin |
| `publish-release` (flip draft → public) | **Yes** — must be done manually |

**macOS remains genuinely unavailable.** `macos-latest` is GitHub-hosted
and billing-blocked; there is no `osxcross` on evorunner and no self-hosted
macOS runner. Say this plainly; do not imply a full three-platform release.

### The manual release procedure (what actually works)

    # 1. Build (Linux + Windows) on evorunner
    ssh evorunner '~/builds/evonext-desktop-release.sh vX.Y.Z --windows'

    # 2. Copy artifacts back to the dev box
    #    Linux:  evorunner:~/builds/target-22.04/release/bundle/{appimage,deb,rpm}/
    #    Win:    evorunner:~/builds/evonext-release/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/
    mkdir -p ~/builds/vX.Y.Z
    rsync -av evorunner:'~/builds/target-22.04/release/bundle/*/*.{AppImage,deb,rpm}' ~/builds/vX.Y.Z/
    rsync -av evorunner:'~/builds/evonext-release/src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*' ~/builds/vX.Y.Z/

    # 3. Create the release object manually (CI never ran)
    #    body MUST be current — CHANGELOG.md is stale (see below)
    gh release create vX.Y.Z --title vX.Y.Z --notes-file <notes> --draft --verify-tag

    # 4. Upload the 8 artifacts
    gh release upload vX.Y.Z ~/builds/vX.Y.Z/* --clobber

    # 5. Publish (this flips draft -> public)
    gh release edit vX.Y.Z --draft=false --verify-tag

    # 6. Update + deploy the updater manifest (see step 14 below)

**Release title MUST be the bare tag** (`vX.Y.Z`), never prefixed.

### Historical evidence for this mechanism (v26.9.16)

| Observation | Conclusion |
|---|---|
| Tag pushed 2026-09-19T16:22:19Z; Actions run `35454738157` failed in 4s | CI died immediately |
| Release object created 16:22:15Z, **published 16:50:48Z** (~28 min later) | Something else built & published |
| Assets uploaded by `nyusternie` ~16:49:49Z, not `github-actions[bot]` | Manual upload |
| `~/.cache/cargo-xwin/clang-cl` symlink timestamped **Sep 19 16:39** | The Windows cross-build ran on evorunner |
| `~/builds/v26.9.16/` on the dev box holds exactly those 8 assets | Staged locally for `gh release upload` |

## ⚠️ GITHUB ACTIONS IS ON A BILLING HOLD — CI IS RED, BUT RELEASES STILL SHIP

**Measured 2026-09-22.** Every workflow job on a GitHub-hosted runner dies
in 4-10 seconds with:

    The job was not started because your account is locked due to a billing issue.

This affects `.github/workflows/release.yml` (`ubuntu-latest`,
`macos-latest`, `windows-latest`) and `.github/workflows/guardian.yml`
(all three matrix platforms). It is NOT new and NOT caused by your change:
it has failed identically on every tag and every `master` push since at
least `v26.9.13` (2026-09-14). Confirmed billing-blocked runs, oldest first:

> **Scope of this hold.** It blocks *runners*, nothing else. It does NOT
> block releases — see the section above. The last time CI actually
> succeeded was **2026-02-24T23:52:11Z**; of the last 100 runs, 17
> succeeded and 81 failed. Treat CI as a **red badge, not a gate**.

    34811291532  2026-09-14  v26.9.13
    34835276186  2026-09-14  v26.9.13
    35072514275  2026-09-16  v26.9.14
    35454738157  2026-09-19  v26.9.16
    35724550301  2026-09-22  v26.9.21

Confirm before blaming a commit:

    gh run list --limit 8
    gh run view <id>          # look for the billing annotation

Only ONE runner is usable: `evorunner-evonext`, a self-hosted GitHub runner.
Do not confuse it with the Gitea runner `act-runner` on the same host —
**evonext-desktop is PUBLIC and lives on GitHub. Gitea is only for PRIVATE
repos. NEVER push desktop to Gitea and never create a `.gitea/` directory
here.**

### The only runner we have

| Fact | Value |
|---|---|
| GitHub runner name | `evorunner-evonext` |
| Labels | `self-hosted`, `Linux`, `X64`, `evorunner` |
| Registered to | `https://github.com/sansbankdao/evonext-desktop` |
| Host | `ssh ubuntu@evorunner` (172.81.178.120) |
| Docker | 29.1.3, with `evobuild:22.04` cached (has webkit2gtk-4.1, node, pnpm, cargo) |
| Toolchains present | node v20.20.2, pnpm 10.34.5, cargo, cargo-xwin, cargo-ndk |
| CPU/mem/disk | 15 GB RAM, 36 GB free on `/` |

Label matching is **case-insensitive**, so `[self-hosted, linux, x64,
evorunner]` DOES match the runner's `Linux`/`X64` labels. `release.yml:35`
is correct as written; do not "fix" it.

### Consequence: we can build Linux ONLY

| Platform | GitHub-hosted job | Can evorunner do it? |
|---|---|---|
| Linux | `ubuntu-latest` (create-release) | **Yes** — move to `evorunner` |
| Linux | `[self-hosted,...,evorunner]` (build-linux) | **Yes** — already correct |
| macOS | `macos-latest` | **No** — Apple SDKs may not leave Apple hardware. No `osxcross` installed. |
| Windows | `windows-latest` | **Yes, VERIFIED** — `~/builds/evonext-desktop-release.sh --windows` cross-builds NSIS via `cargo-xwin`. v26.9.11/13/16 all shipped `.exe`. |
| Linux | `ubuntu-latest` (publish-release) | **Yes** — done manually with `gh release publish` |

**A release cannot produce macOS artifacts while GitHub is billing-blocked.**
Say this plainly to the user; do not imply a full three-platform release is
possible. Options are: (a) ship Linux + Windows via the release script,
(b) restore GitHub billing to regain macOS, (c) find a macOS host.

Shipping Linux + Windows is the **normal, working path** — it is what
v26.9.9/11/13/16 all did. Do not present it as a degraded fallback.

## VERSION NUMBERING

- The version is the USER'S decision, never the agent's.
- Do NOT auto-increment. If the user says "release" without a number: ASK.
- Today's date is NOT a basis for a version. The user sets it.

### The four files that MUST agree

Changing the version means changing **all four**, or the build is
inconsistent:

    package.json                     "version": "26.9.21"
    src-tauri/tauri.conf.json        "version": "26.9.21"
    src-tauri/Cargo.toml             version = "26.9.21"
    src-tauri/Cargo.lock             name = "evonext" -> version = "26.9.21"

Verify (do NOT eyeball; run it):

    cd src-tauri && cargo metadata --format-version 1 > /dev/null \
      && echo "Cargo.lock CONSISTENT" || echo "INCONSISTENT"
    cargo pkgid | head -1        # expect ...#evonext@26.9.21
    python3 -c "import json; json.load(open('package.json')); \
                json.load(open('src-tauri/tauri.conf.json')); print('JSON valid')"

The repo convention (see commit `8fb7af8 "release: v26.9.14"`) is that
feature/fix commits land FIRST, then a **separate** `release: vX.Y.Z`
commit bumps only those four files. A release commit touching anything else
is a defect.

### NEVER RELEASE THE SAME VERSION NAME TWICE

**HARD RULE.** A version name identifies exactly one release, forever. If a
build for `vX.Y.Z` fails, do NOT retry it under the same name. **Bump the
version and cut a NEW name.** A future-dated version name is acceptable; a
reused name is not.

This mirrors the evonext-mobile rule and its root cause: `v26.9.16` there
was released four times (one tag run + three `workflow_dispatch` retries)
and finally succeeded three days later, so time-derived numbers diverged
and Android refused the next upgrade.

Before ANY tag: confirm the name was never used.

    git rev-parse -q --verify refs/tags/v26.9.22 && echo "STOP: name already used"
    git ls-remote --tags origin v26.9.22     # also check the remote

### `CHANGELOG.md` is the release body — and it is NOT auto-generated

`release.yml` sets `body_path: CHANGELOG.md`. **Whatever is in that file
becomes the public release body.** There is no conventional-changelog
pipeline here (unlike evonext-mobile). If you do not write it, the release
ships with stale notes. Check its current contents before tagging:

    head -20 CHANGELOG.md

It may drift from the release commit. Confirm with the user whether to
update it, and never silently rewrite history in it.

### Release title MUST be the bare tag

Per the repo AGENTS.md: release titles MUST be the bare tag only
(e.g. `v26.9.21`). Never prefix with `EvoNext Desktop v26.9.21`.
Note `release.yml` sets `tag_name` but **no `name:`**, so the title
currently defaults to the tag — which is correct. Do not add a `name:`.

## WHAT THE PIPELINE ACTUALLY DOES

> ⚠️ `release.yml` is **vestigial for Linux and Windows** — the build
> already happens in `~/builds/evonext-desktop-release.sh` (see the top
> section). Read it to understand the *intended* CI design, but do NOT
> treat it as the release procedure. Its only remaining unique value is
> the macOS job, which is billing-blocked.

From `.github/workflows/release.yml` (source of truth — re-read it before
relying on this summary):

1. Trigger: tag push matching `v[0-9]+.[0-9]+.[0-9]+*`. **There is no
   `workflow_dispatch`.** Pushing the tag IS the release.
2. `create-release` (`ubuntu-latest`): checks out, creates a **DRAFT**
   GitHub release with `body_path: CHANGELOG.md` and uploads `LICENSE.md`
   + `README.md`. `draft: true` — nothing is public yet.
3. `build-linux` (`[self-hosted, linux, x64, evorunner]`): runs inside
   `container: ubuntu:22.04 --privileged`, apt-installs the webkit2gtk-4.1
   stack, Node 20, Rust, **`pnpm@8`**. Then:

       pnpm tauri build --features realtime --verbose

   Uploads `*.AppImage(.sig)`, `*.deb(.sig)`, `*.rpm(.sig)`.
4. `build-macos` (`macos-latest`): lipo's a universal `export_types`, then
   `pnpm tauri build --features realtime --target universal-apple-darwin`.
   Uploads `*.dmg`, `*.app.tar.gz(.sig)`.
5. `build-windows` (`windows-latest`): `pnpm tauri build --features realtime`.
   Uploads `*.msi(.sig)`, `*.exe`.
6. `publish-release` (`ubuntu-latest`, `needs: [build-linux, build-macos,
   build-windows]`): flips `draft: false`. **This is the production step.**

### `--features realtime` is REQUIRED on all three builds

`realtime` is an off-by-default Cargo feature (`src-tauri/Cargo.toml`, no
`default` list). Without the flag the WebSocket client is compiled out and
`connect_realtime` returns "this build was compiled without the `realtime`
feature" at runtime — a shipped app with no notifications and no error.
All three build steps carry the flag; verify before releasing:

    grep -n 'tauri build' .github/workflows/release.yml   # expect 3 hits, all with --features realtime

Note `export_types` builds (the macOS lipo step) deliberately do NOT get
the flag — that binary has no realtime dependency.

### Signing — key material is NEVER in this repo

For the **release script path** (the one that works), the key comes from
**`~/.config/evonext-signing/env` on evorunner** (mode 0600), sourced at
script line 30. It holds `TAURI_SIGNING_PRIVATE_KEY` and
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The backing key is
`~/.tauri/keys` on this dev box (created 2025-10-05), and the matching
pubkey is embedded in `src-tauri/tauri.conf.json` as
`plugins.updater.pubkey`:

    RWT4FfMsmMgk578xwIW3HFFDEvciO1hEBozIHhlTzplvxQnJnReuGO3/

A separate pair of GitHub **secrets** exists with the same names
(`gh secret list` confirms both) for the vestigial CI path. The env file
itself warns they are **UNVERIFIED** (v26.2.24 CI produced no `.sig`
files). **Do not rely on the GitHub secrets** — use the env file. Never
print, echo, or commit any key material. Never ask the user for it.

`~/evonext-sign/` on evorunner holds the **Android** keystore
(`sansbank.keystore`) and `signing.env` — that is evonext-mobile material,
NOT desktop. Do not touch it for a desktop release.

## PRE-TAG GATES — ALL MUST BE GREEN ON THE FROZEN TREE

Run every one of these BEFORE tagging. A gate that fails after the tag is
pushed cannot be fixed without cutting another version.

| Gate | Command | Expected |
|---|---|---|
| Rust | `./check.sh` | exit 0 |
| Rust tests (direct) | `cd src-tauri && cargo test --lib --features realtime` | 930 passed, 0 failed |
| Frontend | `pnpm test` | 71 files / 639 tests passed |
| Types | `pnpm exec tsc --noEmit` | exit 0 |
| Version consistency | the `cargo metadata` / `pkgid` block above | CONSISTENT, `evonext@X.Y.Z` |
| Workflow YAML | `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/release.yml'))"` | parses |
| realtime flag | `grep -c 'tauri build --features realtime' .github/workflows/release.yml` | 3 |
| Name unused | `git rev-parse -q --verify refs/tags/vX.Y.Z` | not found |
| Tree | `git status --short` | empty (ignored HANDOFF docs excepted) |

**`./check.sh` does NOT run the frontend suite.** Run `pnpm test`
separately or you will ship untested frontend code believing `check.sh`
covered it.

**Baselines drift — re-derive them.** The counts above are a snapshot from
2026-09-22. Compare against the CURRENT run, not against this constant.

### `./check.sh` rewrites `src/bindings.ts`

Its type-gen step regenerates that file and prepends `@ts-nocheck`. A
poorly-written prepend accumulates duplicate headers and leaves a spurious
diff on every run. This was fixed (commit `9d10349`) to be idempotent. If
`git status` shows `src/bindings.ts` dirty after `check.sh`, the prepend
regressed — fix it before releasing, do not commit the noise into the
release commit.

## AFTER an EXPLICIT release (user said yes)

Only once the user has explicitly authorized a specific version.
**The working path is the release script, NOT `git push` + CI.** Steps 1-7
prepare the tree; step 8 onward is the real build.

1. State the version number back to the user before bumping.
2. Confirm the feature commits are already committed and pushed.
3. Bump **all four** version files (see above). Verify consistency.
4. Run ALL pre-tag gates on the frozen tree.
5. Commit as `release: vX.Y.Z` (this repo's convention — not
   `chore(release):`). Only the four version files belong in it.
6. Tag `vX.Y.Z`.
7. Push master, THEN the tag:

       git push origin master && git push origin vX.Y.Z

8. **Build on evorunner — this is the part that actually produces artifacts**
   (sign-off required; it takes ~20-30 min and burns the host):

       ssh evorunner '~/builds/evonext-desktop-release.sh vX.Y.Z --windows'

   The CI run that the tag push triggers will fail in 4-10 s with the
   billing annotation. **That is expected and harmless.** Do not chase it.

9. **Watch the script's own output**, not the CI run. It prints
   `== Building vX.Y.Z (sha) ==` then `== Artifacts ==` with absolute paths.
   Verify fresh artifacts on disk — never trust the exit code alone.

10. Copy artifacts to the dev box into `~/builds/vX.Y.Z/` (see the rsync
    block above).

11. **Create the release object manually** — CI's `create-release` job never
    ran, so no draft exists:

        gh release create vX.Y.Z --title vX.Y.Z --notes-file <notes> --draft

    `CHANGELOG.md` is **stale** (last touched 2026-02-24, still describes
    the "7th Release Candidate") — `release.yml` uses it as `body_path`, but
    if you create the release manually you must supply current notes.
    Confirm the body text with the user; never silently reuse the stale one.

12. Upload the 8 artifacts and publish:

        gh release upload vX.Y.Z ~/builds/vX.Y.Z/* --clobber
        gh release publish vX.Y.Z

13. Verify it is public and carries the artifacts:

        gh release view vX.Y.Z
        gh release view vX.Y.Z --json isDraft,assets \
          --jq '{draft:.isDraft, assets:[.assets[].name]}'

    Expected: `draft:false` and 8 assets (`.AppImage`, `.deb`, `.rpm`,
    `.exe` and a `.sig` for each). macOS assets are absent by necessity.

14. **Update the updater manifest — this is a REQUIRED release step, and
    it is a SEPARATE repository.** The endpoint is
    `https://manifest.evonext.app/desktop` (`src-tauri/tauri.conf.json`
    `plugins.updater.endpoints`). Nothing in `release.yml` and nothing in
    the release script touches it. **A release that skips this step does
    NOT reach auto-updating clients** — they will keep seeing the previous
    version.

    - Repo: `/Workspace/sansbank/evonext-manifest` (Gitea remote).
    - File: `manifests/desktop.json` — bundled into the Cloudflare Worker
      at deploy time (no KV/D1).
    - Update `version`, `pub_date`, `notes`, and **one `platforms` entry
      per shipped platform**. `signature` MUST be the exact contents of
      the uploaded `.sig` asset. Use tag-pinned URLs
      (`/releases/download/vX.Y.Z/...`) — never `/releases/latest/...`,
      which drifts and breaks signature matching.
    - Platform keys are `linux-x86_64` (AppImage), `windows-x86_64`
      (`.exe`), `darwin-aarch64`/`darwin-x86_64` (`.app.tar.gz`).

    Verify the signatures are byte-identical to the built `.sig` files
    BEFORE deploying (compare in Python; do not eyeball base64):

        python3 -c "import json;m=json.load(open('manifests/desktop.json'));\
        s=open('/home/shomari/builds/vX.Y.Z/EvoNext_X.Y.Z_amd64.AppImage.sig').read().strip();\
        print('match', s==m['platforms']['linux-x86_64']['signature'].strip())"

    Then validate, deploy, and confirm live:

        cd /Workspace/sansbank/evonext-manifest
        pnpm validate && pnpm test
        export CLOUDFLARE_API_TOKEN=$(cat /tmp/cf-token.txt)   # see auth below
        npx wrangler@4 deploy        # NOT `pnpm deploy`: pnpm@8 breaks workspace v6
        curl -s https://manifest.evonext.app/desktop | head -5   # expect new version

    **Cloudflare auth.** Local `wrangler whoami` is UNAUTHENTICATED. The
    token lives on the sansbank VM at `~/.cloudflare/api-token` (mode 0600,
    account `Sansbank DAO` `cff27acd0f4e86139f6cf3f1a295d4b0`). Never echo
    it; pipe it to a `chmod 600` temp file, use it, then `shred -u` it.
    Verify it can read the worker first:

        curl -s "https://api.cloudflare.com/client/v4/accounts/<account>/workers/scripts/evonext-manifest" -H "Authorization: Bearer $TOKEN" | head -c 100

    Commit the manifest change (`manifest: vX.Y.Z — <summary>`) and push.
    The manifest repo's only remote is **Gitea** — which is correct here,
    because that repo is private. (Do not confuse this with
    evonext-desktop, which is public and GitHub-only.)

### Do NOT expect the tag push to build anything

Pushing the tag does two things: it records the tag, and it triggers a
workflow that immediately dies on billing. It produces **zero artifacts**.
The artifacts come from step 8. A future reader who only follows
`release.yml` will conclude the release is impossible. It is not.

### Pre-flight identity check

    git config --local user.name    # expect: Shomari (or Sansbank contributors)
    git config --local user.email   # expect: nyusternie@sdot.io (or hello@sansbank.org)

Fix with `git commit --amend --reset-author` BEFORE the first push.
Amending after a tag is pushed orphans the tag — do not.

## IF THE AGENT IS ABOUT TO RELEASE WITHOUT AUTHORIZATION

If you detect yourself reasoning toward a release without an explicit user
instruction, STOP IMMEDIATELY and output:

    RELEASE-GATE: STOP — no explicit user release instruction detected.
    I will not bump version, tag, push, or trigger CI until you say so.

## CONTEXT

- This repo: **evonext-desktop** (Tauri v2 + Vue 3). Its ONLY remote is
  `origin` = `git@github.com:sansbankdao/evonext-desktop.git` — GitHub.
  It is a PUBLIC repo.
- **Gitea is for PRIVATE repos only. evonext-desktop is NOT on Gitea and
  must never be pushed there.** Do not add a Gitea remote, do not create
  `.gitea/workflows/`, do not `git ls-remote` Gitea while working here.
  (The Gitea/`act-runner` on the evorunner host serves the mobile repo.)
- A tag push IS **not** the build any more — it only records the tag and
  triggers a CI run that dies on billing. The build is the evorunner
  release script; the publish is `gh release create/upload/publish`.
- Releases shipped continuously (v26.9.9/11/13/16) **entirely outside CI**.
  The billing hold has never blocked a release; it only reddens the badge.
- Standing user directive: "Don't burn ~1hr builds without sign-off."
- Related sibling skill: `evonext-mobile/.agents/skills/release-gate`.
  The mobile version is Android-specific (versionCode arithmetic,
  `apk.evonext.app` pointer). Desktop has no versionCode and no APK — do
  not copy those rules here.
