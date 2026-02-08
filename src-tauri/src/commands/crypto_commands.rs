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
    let mut sha256_hasher = Sha256::new();
    sha256_hasher.update(&data);
    let sha256_result = sha256_hasher.finalize();
    let mut ripemd160_hasher = Ripemd160::new();
    ripemd160_hasher.update(sha256_result);
    let ripemd160_result = ripemd160_hasher.finalize();
    Ok(ripemd160_result.to_vec())
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
