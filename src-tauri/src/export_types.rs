// src-tauri/src/export_types.rs

use tauri_specta::{collect_commands, Builder};
use specta_typescript::Typescript;

use evonext::commands::identity_commands;

fn main() {
    let out_path = "../src/types/rust_generated.ts";

    Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            identity_commands::save_identity,
            identity_commands::delete_identity,
            identity_commands::save_keys,
            identity_commands::load_keystore
        ])
        .export(Typescript::default(), out_path)
        .expect("Failed to export types");
}
