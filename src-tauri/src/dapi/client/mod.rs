// src-tauri/src/dapi/client/mod.rs

mod base;
mod validation;
mod cache;
pub mod methods;

pub use base::DAPIClient;
pub use base::get_dapi_client;
pub use validation::MethodParamInfo;    // Re-export specific items
pub use validation::validate_dapi_params; // Re/export specific items

// Re-export all method types for convenience
pub use methods::*;
