// src-tauri/src/commands/crypto_commands.rs

use tauri::{command, AppHandle, Runtime};
use sha2::{Sha256, Digest};
use ripemd::Ripemd160;
use rand::RngCore;

#[tauri::command]
pub async fn hash160<R: Runtime>(
    app_handle: AppHandle<R>,
    data: Vec<u8>,
) -> Result<Vec<u8>, String> {
    println!("[RUST-DEBUG] hash160 invoked.");
    // println!("[RUST-DEBUG] AppHandle ID: {}", app_handle.id());
    println!("[RUST-DEBUG] Data length: {}", data.len());
    println!("[RUST-DEBUG] Input data (hex): {:?}", data);

    // Calculate SHA256
    let mut sha256_hasher = Sha256::new();
    sha256_hasher.update(&data);
    let sha256_result = sha256_hasher.finalize();

    // Calculate RIPEMD160
    let mut ripemd160_hasher = Ripemd160::new();
    ripemd160_hasher.update(sha256_result);
    let ripemd160_result = ripemd160_hasher.finalize();
    let result = ripemd160_result.to_vec();
    println!("[RUST-DEBUG] hash160 calculation complete.");
    println!("[RUST-DEBUG] Result: {:?}", result);


    Ok(result)
}

#[command]
pub async fn random_bytes<R: Runtime>(
    app_handle: AppHandle<R>,
    length: usize,
) -> Result<Vec<u8>, String> {
    println!("[RUST-DEBUG] random_bytes called for length: {}", length);
    let mut bytes = vec![0u8; length];
    rand::rng().fill_bytes(&mut bytes);
    Ok(bytes)
}
