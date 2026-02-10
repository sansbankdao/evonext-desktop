// src-tauri/src/commands/hash_commands.rs

use sha2::{Digest, Sha256};
use ripemd::{Ripemd160};

#[tauri::command]
pub async fn hash160(
    _app_handle: tauri::AppHandle,
    data: Vec<u8>,
) -> Result<Vec<u8>, String> {
    hash160_logic(data)

}
pub fn hash160_logic(data: Vec<u8>) -> Result<Vec<u8>, String> {
    let sha256_result = Sha256::digest(&data);
    let ripemd160_result = Ripemd160::digest(&sha256_result);
    Ok(ripemd160_result.to_vec())
}
