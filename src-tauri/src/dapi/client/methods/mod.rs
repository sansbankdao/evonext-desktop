// src-tauri/src/dapi/client/methods/mod.rs

pub mod contracts;
pub mod documents;
pub mod dpns;
pub mod identity;
pub mod system;
pub mod tokens;

// Re-export all method implementations
pub use contracts::*;
pub use documents::*;
pub use dpns::*;
pub use identity::*;
pub use system::*;
pub use tokens::*;
