// src-tauri/src/commands/crypto_commands.rs

use tauri::{AppHandle, Runtime};
use sha2::{Sha256, Digest};
use ripemd::Ripemd160;
use rand::RngCore;

#[cfg(test)]
mod tests;

#[tauri::command]
pub async fn hash160<R: Runtime>(
    _app_handle: AppHandle<R>,
    data: Vec<u8>,
) -> Result<Vec<u8>, String> {
    // Bitcoin Standard HASH160: RIPEMD160(SHA256(data))
    let sha256_hash = Sha256::digest(&data);
    let ripemd160_hash = Ripemd160::digest(sha256_hash);
    Ok(ripemd160_hash.to_vec())
}

#[tauri::command]
pub async fn random_bytes<R: Runtime>(
    _app_handle: AppHandle<R>,
    length: usize,
) -> Result<Vec<u8>, String> {
    let mut bytes = vec![0u8; length];
    rand::rng().fill_bytes(&mut bytes);
    Ok(bytes)
}
