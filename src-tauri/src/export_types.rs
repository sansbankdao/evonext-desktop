// src-tauri/src/export_types.rs

use tauri_specta::Typescript;
use crate::commands::identity_commands::{ISaveIdentityPayload, IUnifiedCommandResult};

fn main() {
    // In Specta v2 RC, we use the Builder pattern
    let out_path = "../src/types/rust_generated.ts";

    tauri_specta::Builder::<tauri::Wry>::new()
        .type_distribution(tauri_specta::TypeDistribution::NoExport)
        .types(tauri_specta::collect_types![
            ISaveIdentityPayload,
            IUnifiedCommandResult
        ])
        .export(Typescript::default(), out_path)
        .expect("Failed to export types");

    println!("✅ Types exported to {}", out_path);
}
