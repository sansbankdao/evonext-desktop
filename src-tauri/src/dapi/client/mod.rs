// src-tauri/src/dapi/client/mod.rs

mod base;
mod cache;
pub mod methods;
mod validation;

pub use base::get_dapi_client;
pub use base::DAPIClient;
pub use validation::validate_dapi_params;
pub use validation::MethodParamInfo;
pub use validation::params_array_to_object;

// Re-export all method types for convenience
pub use methods::*;
