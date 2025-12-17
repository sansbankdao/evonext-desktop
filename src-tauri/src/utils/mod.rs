// src-tauri/src/utils/mod.rs

// mod macros;  // Comment out since not used
mod store;  // Keep as private since we're re-exporting its contents

// pub use macros::*;  // Comment out since not used
pub use store::*;  // Re-export StoreManager and StoreError
