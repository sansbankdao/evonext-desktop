// src-tauri/src/commands/crypto_commands.rs

use tauri::Runtime;

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub fn hash160(
    _app: tauri::AppHandle,
    input: Vec<u8>
) -> Result<Vec<u8>, String> {
    hash160_inner(_app, input)
}

/// Internal generic version for testing
pub fn hash160_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    input: Vec<u8>
) -> Result<Vec<u8>, String> {
    use ripemd::{Digest, Ripemd160};
    use sha2::Sha256;
    let sha_hash = Sha256::digest(&input);
    let rip_hash = Ripemd160::digest(&sha_hash);
    Ok(rip_hash.to_vec())
}

#[tauri::command]
#[specta::specta]
pub fn random_bytes(
    _app: tauri::AppHandle,
    len: u32, // Changed from usize to u32 for TypeScript compatibility
) -> Result<Vec<u8>, String> {
    random_bytes_inner(_app, len)
}

/// Internal generic version for testing
pub fn random_bytes_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    len: u32, // Changed from usize to u32 for TypeScript compatibility
) -> Result<Vec<u8>, String> {
    use rand::RngCore;
    // Cast to usize for the local memory allocation
    let mut bytes = vec![0u8; len as usize];
    rand::rng().fill_bytes(&mut bytes);
    Ok(bytes)
}
