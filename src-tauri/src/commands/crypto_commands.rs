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

// Internal generic version for testing
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
    len: usize
) -> Result<Vec<u8>, String> {
    random_bytes_inner(_app, len)
}

pub fn random_bytes_inner<R: Runtime>(
    _app: tauri::AppHandle<R>,
    len: usize
) -> Result<Vec<u8>, String> {
    use rand::RngCore;
    let mut bytes = vec![0u8; len];
    rand::rng().fill_bytes(&mut bytes);
    Ok(bytes)
}
