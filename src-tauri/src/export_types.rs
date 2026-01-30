// src-tauri/src/export_types.rs

use tauri_specta::{collect_commands, Builder};
// In RC.20, the Typescript exporter is located here:
use tauri_specta::typescript::Typescript;

// Import the commands from your library
use evonext::commands::identity_commands;

fn main() {
    let out_path = "../src/types/rust_generated.ts";

    // You MUST provide <tauri::Wry> here to solve the E0283 "type annotations needed" error.
    // This tells the compiler that the generic 'R' in your commands is tauri::Wry.
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            identity_commands::save_identity,
            identity_commands::delete_identity,
            identity_commands::save_keys,
            identity_commands::load_keystore
        ]);

    builder
        .export(Typescript::default(), out_path)
        .expect("Failed to export types");

    println!("✅ Bridge established: {}", out_path);
}
