// src-tauri/src/export_types.rs

use std::env;
use std::fs;
use std::path::Path;

use tauri_specta::{collect_commands, Builder};
use specta_typescript::Typescript;
use evonext::commands::identity_commands;

fn main() {
    // Robust path: Prefer root/src/types/ relative to project root
    let out_path_buf = match env::current_dir() {
        Ok(cwd) if cwd.ends_with("src-tauri") => cwd.parent().unwrap().join("src").join("types").join("rust_generated.ts"),
        Ok(cwd) => cwd.join("src").join("types").join("rust_generated.ts"),  // If run from root
        Err(_) => Path::new("..").join("..").join("src").join("types").join("rust_generated.ts"),  // Fallback for src-tauri/src cwd
    };

    let types_dir = out_path_buf.parent().unwrap();
    if let Err(e) = fs::create_dir_all(types_dir) {
        eprintln!("Failed to create types directory at {:?}: {}", types_dir, e);
        std::process::exit(1);
    }

    let out_path = out_path_buf.to_str().expect("Failed to convert path to string");

    // Specify <tauri::Wry> on the builder
    let builder = Builder::<tauri::Wry>::new()
        .commands(collect_commands![
            // Use turbofish <tauri::Wry> on each command to solve E0283
            identity_commands::save_identity::<tauri::Wry>,
            identity_commands::delete_identity::<tauri::Wry>,
            identity_commands::save_keys::<tauri::Wry>,
            identity_commands::load_keystore::<tauri::Wry>
        ]);

    if let Err(e) = builder.export(Typescript::default(), out_path) {
        eprintln!("Failed to export types to {}: {}", out_path, e);
        std::process::exit(1);
    }

    println!("✅ Bridge established: {}", out_path);
}
