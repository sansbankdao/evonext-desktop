// src-tauri/src/commands/crypto_commands.rs

use sha2::{Sha256, Digest};
use ripemd::Ripemd160;
use rand::RngCore;

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub fn hash160(
    _app: tauri::AppHandle,
    data: Vec<u8>,
) -> Result<Vec<u8>, String> {
    let sha256_hash = Sha256::digest(&data);
    let ripemd160_hash = Ripemd160::digest(sha256_hash);
    Ok(ripemd160_hash.to_vec())
}

#[tauri::command]
#[specta::specta]
pub fn random_bytes(
    _app: tauri::AppHandle,
    length: u32,
) -> Result<Vec<u8>, String> {
    let mut bytes = vec![0u8; length as usize];
    rand::rng().fill_bytes(&mut bytes);
    Ok(bytes)
}
