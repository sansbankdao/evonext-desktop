// src-tauri/src/commands/hash_commands.rs

use crate::utils::store::StoreManager;
use sha2::Sha256;
use ripemd160::Ripemd160;
use tauri::AppHandle;
use tauri::command;

#[command]
pub async fn hash160(
    app_handle: AppHandle,
    data: Vec<u8>,
) -> Result<Vec<u8>, String> {
    println!("[RUST-DEBUG] hash160 invoked.");
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
// Add other hash-related commands here in the future if needed
