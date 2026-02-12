// src-tauri/src/commands/crypto_commands.rs

use crate::models::ICommandResult;
use crate::cmd_res;

#[cfg(test)]
mod tests;

#[tauri::command]
#[specta::specta]
pub fn hash160(
    _app: tauri::AppHandle,
    input: Vec<u8>
) -> ICommandResult<Vec<u8>> {
    cmd_res!(hash160_logic(input))
}

/// Pure logic version: No tauri types, no Runtime required.
pub fn hash160_logic(
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
    len: u32,
) -> ICommandResult<Vec<u8>> {
    cmd_res!(random_bytes_logic(len))
}

/// Pure logic version: No tauri types, no Runtime required.
pub fn random_bytes_logic(
    len: u32,
) -> Result<Vec<u8>, String> {
    use rand::RngCore;
    let mut bytes = vec![0u8; len as usize];
    rand::rng().fill_bytes(&mut bytes);
    Ok(bytes)
}
