// src-tauri/src/dapi/client/methods/mod.rs

pub mod contracts;
pub mod documents;
pub mod dpns;
pub mod identity;
pub mod system;
pub mod tokens;

// Re-export all method implementations
#[allow(unused_imports)]
pub use contracts::*;
pub use documents::*;
#[allow(unused_imports)]
pub use dpns::*;
#[allow(unused_imports)]
pub use identity::*;
pub use system::*;
#[allow(unused_imports)]
pub use tokens::*;
