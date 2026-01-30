// src-tauri/src/export_types.rs

use tauri_specta::{collect_types, Typescript};
use evonext::models::*;
use evonext::commands::identity_commands::{ISaveIdentityPayload, IUnifiedCommandResult};

fn main() {
    let out_path = "../src/types/rust_generated.ts";

    // This is the correct v2-rc.20+ syntax
    let builder = tauri_specta::Builder::<tauri::Wry>::new()
        .types(collect_types![
            // Payloads
            ISaveIdentityPayload,
            IUnifiedCommandResult,

            // Core Data structs
            IIdentityData,
            IIdentityPublicKey,
            IPrivateKeyEntry,
            IMnemonic,

            // Settings & Assets
            IAppSettings,
            IAssetDefinition,
            ILicense,

            // Complex Store Wrappers
            IPrivateKeyStore,
            IDiscoveredIdentitiesStore
        ]);

    builder
        .export(Typescript::default(), out_path)
        .expect("Failed to export types");

    println!("✅ Types successfully generated in {}", out_path);
}
