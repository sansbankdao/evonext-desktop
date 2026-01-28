// src-tauri/src/commands/crypto_commands.rs

use sha2::{Sha256, Digest};
use ripemd::Ripemd160;
use rand::RngCore;
use tauri::{command, AppHandle, Runtime};

#[command]
pub async fn hash160<R: Runtime>(
    _app: AppHandle<R>,
    data: Vec<u8>,
) -> Result<Vec<u8>, String> {
    // Calculate SHA256
    let mut sha256_hasher = Sha256::new();
    sha256_hasher.update(&data);
    let sha256_result = sha256_hasher.finalize();
    // Calculate RIPEMD160
    let mut ripemd160_hasher = Ripemd160::new();
    ripemd160_hasher.update(sha256_result);
    let ripemd160_result = ripemd160_hasher.finalize();
    Ok(ripemd160_result.to_vec())
}

#[command]
pub async fn random_bytes<R: Runtime>(
    _app: AppHandle<R>,
    length: usize,
) -> Result<Vec<u8>, String> {
    let mut bytes = vec![0u8; length];
    rand::rng().fill_bytes(&mut bytes);
    Ok(bytes)
}
