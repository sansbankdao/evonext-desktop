#!/bin/bash
set -e

echo "Step 1: Exporting Types (The Bridge)..."
cd src-tauri
cargo run --bin export_types
cd ..

# Safety check: Prepend @ts-nocheck to the newly generated file
GENERATED_FILE="src/bindings.ts"

if [ -f "$GENERATED_FILE" ]; then
    # Use a temporary file to safely prepend the comment.
    # Strip any header a previous run (or package.json type:gen) already added,
    # so repeated runs are idempotent instead of accumulating duplicates.
    # The no-space form matches package.json type:gen exactly, so the two
    # generators agree and neither leaves a spurious diff.
    TMP_FILE="$(mktemp)"
    { echo "//@ts-nocheck"; sed '1{/^\/\/[[:space:]]*@ts-nocheck$/d;}' "$GENERATED_FILE"; } > "$TMP_FILE"
    mv "$TMP_FILE" "$GENERATED_FILE"
    echo "✅ Applied @ts-nocheck to $GENERATED_FILE"
else
    echo "❌ Error: $GENERATED_FILE was not generated!"
    exit 1
fi

echo "Step 2: Checking Rust Logic (The Enforcer)..."
cd src-tauri
cargo test --lib
cd ..

echo "Step 3: Verifying Frontend Integrity (The Bridge Check)..."
pnpm exec tsc --noEmit
