// src-tauri/src/commands/mod.rs
mod asset_commands;
mod identity_commands;
mod identity_details_commands;
mod license_commands;
mod mnemonic_commands;
mod settings_commands;

// Keep only what's actually used or re-export all if needed
// Since we're using them in lib.rs, we need to keep them
// The warnings are harmless but we can silence them with #[allow(unused_imports)]
#[allow(unused_imports)]
pub use asset_commands::*;
#[allow(unused_imports)]
pub use identity_commands::*;
#[allow(unused_imports)]
pub use identity_details_commands::*;
#[allow(unused_imports)]
pub use license_commands::*;
#[allow(unused_imports)]
pub use mnemonic_commands::*;
#[allow(unused_imports)]
pub use settings_commands::*;
