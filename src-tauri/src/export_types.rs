// src-tauri/src/export_types.rs

use specta::collect_types;
use tauri_specta::ts;
use crate::types::rust::{IdentityData, SaveIdentityPayload};

fn main() {
    ts::export(
        collect_types![IdentityData, SaveIdentityPayload],
        "../src/types/rust_generated.ts"
    ).expect("Failed to export types");
}
