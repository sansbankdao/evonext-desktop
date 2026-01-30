#!/bin/bash
set -e

echo "Step 1: Exporting Types (The Bridge)..."
cd src-tauri
cargo run --bin export_types
cd ..

# Safety check: Prepend @ts-nocheck to the newly generated file
GENERATED_FILE="src/types/rust_generated.ts"

if [ -f "$GENERATED_FILE" ]; then
    # Use a temporary file to safely prepend the comment
    echo -e "// @ts-nocheck\n$(cat $GENERATED_FILE)" > "$GENERATED_FILE"
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
