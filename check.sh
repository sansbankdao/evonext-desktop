#!/bin/bash
set -e # Exit on any failure

echo "Step 1: Exporting Types (The Bridge)..."
cd src-tauri
cargo run --bin export_types

echo "Step 2: Checking Rust Logic (The Enforcer)..."
cargo test --lib

echo "Step 3: Verifying Frontend Integrity (The Bridge Check)..."
cd ..
pnpm exec tsc --noEmit

echo "Step 4: Running Frontend Unit Tests (The UI Logic)..."
pnpm exec vitest run
