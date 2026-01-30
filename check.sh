#!/bin/bash
set -e

echo "Step 1: Exporting Types (The Bridge)..."
cd src-tauri
cargo run --bin export_types
cd ..

# Add @ts-nocheck to the top of the generated file so TSC ignores unused variables
# This is a one-liner that prepends the comment to the file
sed -i '1s/^/\/\/ @ts-nocheck\n/' src/types/rust_generated.ts

echo "Step 2: Checking Rust Logic (The Enforcer)..."
cd src-tauri
cargo test --lib
cd ..

echo "Step 3: Verifying Frontend Integrity (The Bridge Check)..."
pnpm exec tsc --noEmit
