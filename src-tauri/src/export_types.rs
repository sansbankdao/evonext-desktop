// src-tauri/src/export_types.rs

use tauri_specta::{collect_commands, Builder};
use specta_typescript::Typescript;
use evonext::commands::identity_commands;
use evonext::models::{IIdentityData, IPrivateKeyStore, IIdentityPublicKey, IDiscoveredIdentity, ILicense};

#[cfg(test)]
mod tests;

pub fn create_builder() -> Builder<tauri::Wry> {
    Builder::<tauri::Wry>::new()
        .typ::<IIdentityData>()
        .typ::<IPrivateKeyStore>()
        .typ::<IIdentityPublicKey>()
        .typ::<IDiscoveredIdentity>()
        .typ::<ILicense>()
        .commands(collect_commands![
            identity_commands::save_identity::<tauri::Wry>,
            identity_commands::delete_identity::<tauri::Wry>,
            identity_commands::save_keys::<tauri::Wry>,
            identity_commands::load_keystore::<tauri::Wry>
        ])
}
fn main() {
    let out_path = "../../src/types/rust_generated.ts";
    let builder = create_builder();
    builder.export(Typescript::default(), out_path).expect("Export failed");
}
