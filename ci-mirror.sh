#!/bin/bash
# ci-mirror.sh
#
# Local mirror of .github/workflows/guardian.yml (the "EvoNext (Desktop) CI
# Suite"). GitHub Actions has been billing-locked, so this script exists to
# predict push health WITHOUT the runner. Every command below is copied
# verbatim from the corresponding `run:` block in guardian.yml; the step names
# and order match the workflow exactly.
#
# WHY THIS EXISTS: `./check.sh` is the fast mandated gate (export_types +
# cargo test --lib + tsc) and `pnpm check` adds fmt + llvm-cov, but NEITHER runs
# `cargo clippy --all-features --lib -- -D warnings`, `vite build`, a release
# `cargo build`, `vue-tsc --noEmit --skipLibCheck`, or E2E. A push can therefore
# pass every local gate and still go red in CI. This script closes that gap.
#
# USAGE:
#   ./ci-mirror.sh                # all gates except E2E (E2E needs a display)
#   ./ci-mirror.sh --with-e2e     # also run E2E (requires xvfb-run + Chrome)
#   ./ci-mirror.sh --fail-fast    # stop at the first failing gate (CI behaviour)
#   ./ci-mirror.sh --list         # print the gate list and exit
#
# EXIT: 0 if every gate that RAN passed, 1 otherwise. Gates that are SKIPPED
# (e.g. E2E without a display) are reported but do not fail the run.

set -uo pipefail

# ── Configuration ──────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAURI_DIR="$ROOT/src-tauri"

RUN_E2E=0
FAIL_FAST=0
LIST_ONLY=0

for arg in "$@"; do
    case "$arg" in
        --with-e2e)  RUN_E2E=1 ;;
        --fail-fast) FAIL_FAST=1 ;;
        --list)      LIST_ONLY=1 ;;
        -h|--help)
            sed -n '2,30p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *)
            echo "ci-mirror: unknown argument: $arg" >&2
            echo "try: ./ci-mirror.sh --help" >&2
            exit 2
            ;;
    esac
done

# ── Gate table (name | working dir | command) ──────────────────
# Order and commands are taken 1:1 from guardian.yml.
GATE_NAMES=(
    "Check Rust Formatting"
    "Clippy Lint"
    "Generate Types (Specta)"
    "Build Frontend"
    "Build Tauri App"
    "Run Rust Unit Tests (with coverage)"
    "Run Frontend Tests"
    "Run Type Check"
)
GATE_DIRS=(
    "$TAURI_DIR"
    "$TAURI_DIR"
    "$TAURI_DIR"
    "$ROOT"
    "$TAURI_DIR"
    "$TAURI_DIR"
    "$ROOT"
    "$ROOT"
)
GATE_CMDS=(
    "cargo fmt --all -- --check"
    "cargo clippy --all-features --lib -- -D warnings"
    "cargo run --bin export_types && node -e \"const fs=require('fs');const path=require('path');const f=path.join('..','src','bindings.ts');if(fs.existsSync(f)){const c=fs.readFileSync(f,'utf8');if(!c.startsWith('//@ts-nocheck')){fs.writeFileSync(f,'//@ts-nocheck\\n'+c);}}\""
    "pnpm exec vite build"
    "cargo build"
    "cargo llvm-cov --all-features --lib --lcov --output-path lcov-rust.info"
    "pnpm test"
    "pnpm exec vue-tsc --noEmit --skipLibCheck"
)

rel_dir() {
    if [ "$1" = "$ROOT" ]; then echo "."; else echo "${1#"$ROOT"/}"; fi
}

if [ "$LIST_ONLY" -eq 1 ]; then
    echo "Local CI mirror gates (from .github/workflows/guardian.yml):"
    for i in "${!GATE_NAMES[@]}"; do
        printf '  %d. %-38s (in %s)\n' "$((i + 1))" "${GATE_NAMES[$i]}" "$(rel_dir "${GATE_DIRS[$i]}")"
        printf '       %s\n' "${GATE_CMDS[$i]}"
    done
    echo "  E2E: xvfb-run --auto-servernum pnpm run test:e2e   (only with --with-e2e)"
    exit 0
fi

# ── Preflight ──────────────────────────────────────────────────
command -v cargo >/dev/null 2>&1 || { echo "ci-mirror: cargo not found on PATH" >&2; exit 2; }
command -v pnpm  >/dev/null 2>&1 || { echo "ci-mirror: pnpm not found on PATH"  >&2; exit 2; }

# ── Runner ─────────────────────────────────────────────────────
PASSED=0
FAILED=0
SKIPPED=0
RESULTS=()

run_gate() {
    local idx="$1"
    local name="${GATE_NAMES[$idx]}"
    local dir="${GATE_DIRS[$idx]}"
    local cmd="${GATE_CMDS[$idx]}"

    echo ""
    echo "============================================================"
    echo "GATE $((idx + 1))/${#GATE_NAMES[@]}: $name"
    echo "  cwd: ${dir#"$ROOT"/}"
    echo "  cmd: $cmd"
    echo "============================================================"

    ( cd "$dir" && eval "$cmd" )
    local rc=$?

    if [ "$rc" -eq 0 ]; then
        echo "PASS: $name"
        PASSED=$((PASSED + 1))
        RESULTS+=("PASS    $name")
    else
        echo "FAIL: $name (exit $rc)" >&2
        FAILED=$((FAILED + 1))
        RESULTS+=("FAIL    $name (exit $rc)")
        if [ "$FAIL_FAST" -eq 1 ]; then
            echo "ci-mirror: --fail-fast set, stopping after first failure" >&2
            skip_rest "$((idx + 1))"
            return 1
        fi
    fi
    return 0
}

skip_rest() {
    local from="$1"
    local i
    for ((i = from; i < ${#GATE_NAMES[@]}; i++)); do
        RESULTS+=("SKIP    ${GATE_NAMES[$i]} (fail-fast)")
        SKIPPED=$((SKIPPED + 1))
    done
}

for i in "${!GATE_NAMES[@]}"; do
    run_gate "$i" || { EXIT_EARLY=1; break; }
done

# ── E2E (opt-in) ───────────────────────────────────────────────
if [ "$RUN_E2E" -eq 1 ]; then
    echo ""
    echo "============================================================"
    echo "GATE: Run E2E Tests (guardian.yml, ubuntu-blocking)"
    echo "============================================================"
    if [ "$(uname -s)" = "Linux" ] && ! command -v xvfb-run >/dev/null 2>&1; then
        echo "SKIP: xvfb-run not found; cannot run E2E headlessly."
        RESULTS+=("SKIP    Run E2E Tests (no xvfb-run)")
        SKIPPED=$((SKIPPED + 1))
    else
        ( cd "$ROOT" && CI=true pnpm run test:e2e )
        if [ $? -eq 0 ]; then
            echo "PASS: Run E2E Tests"
            PASSED=$((PASSED + 1))
            RESULTS+=("PASS    Run E2E Tests")
        else
            echo "FAIL: Run E2E Tests" >&2
            FAILED=$((FAILED + 1))
            RESULTS+=("FAIL    Run E2E Tests")
        fi
    fi
else
    echo ""
    echo "E2E not run (pass --with-e2e to include it; needs xvfb-run + Chrome)."
    RESULTS+=("SKIP    Run E2E Tests (not requested)")
    SKIPPED=$((SKIPPED + 1))
fi

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "============================================================"
echo "LOCAL CI MIRROR SUMMARY"
echo "============================================================"
for line in "${RESULTS[@]}"; do
    echo "  $line"
done
echo "------------------------------------------------------------"
printf 'passed=%d  failed=%d  skipped=%d\n' "$PASSED" "$FAILED" "$SKIPPED"

# ── Coverage artifact check (guardian.yml ubuntu step) ─────────
if [ -f "$TAURI_DIR/lcov-rust.info" ]; then
    echo "Coverage file present: src-tauri/lcov-rust.info ($(wc -l < "$TAURI_DIR/lcov-rust.info") lines)"
else
    echo "NOTE: src-tauri/lcov-rust.info absent (llvm-cov gate did not complete or was skipped)."
fi

if [ "$FAILED" -gt 0 ]; then
    echo "RESULT: FAIL ($FAILED gate(s) failed) — this push would go red in CI." >&2
    exit 1
fi
echo "RESULT: PASS (all executed gates green)"
exit 0
