#!/bin/bash

# 1. Regenerate Types (The Contract)
cd src-tauri
cargo run --bin export_types

# 2. Check Rust Logic (The Enforcer)
cargo test --lib

# 3. Check Frontend Types (The Bridge)
cd ..
pnpm exec tsc --noEmit
