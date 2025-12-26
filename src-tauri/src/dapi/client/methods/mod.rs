// src-tauri/src/dapi/client/methods/mod.rs

pub mod documents;
pub mod identity;
pub mod contracts;
pub mod dpns;
pub mod tokens;
pub mod system;

// Re-export all method implementations
pub use documents::*;
pub use identity::*;
pub use contracts::*;
pub use dpns::*;
pub use tokens::*;
pub use system::*;
