// src-tauri/src/export_types.rs

use tauri_specta::{collect_commands, Builder};
use specta_typescript::Typescript;
use evonext::commands::identity_commands;

fn main() {
    let out_path = "../src/types/rust_generated.ts";

    // Specify <tauri::Wry> on the builder
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            // Use turbofish <tauri::Wry> on each command to solve E0283
            identity_commands::save_identity::<tauri::Wry>,
            identity_commands::delete_identity::<tauri::Wry>,
            identity_commands::save_keys::<tauri::Wry>,
            identity_commands::load_keystore::<tauri::Wry>
        ]);

    builder
        .export(Typescript::default(), out_path)
        .expect("Failed to export types");

    println!("✅ Bridge established: {}", out_path);
}
