// src/services/crypto.ts

import { invoke } from '@tauri-apps/api/core'

/**
 * Calculate hash160 (RIPEMD160(SHA256(data))) using Rust backend
 */
export async function hash160(data: Uint8Array): Promise<Uint8Array> {
    try {
        const result = await invoke<number[]>('hash160', {
            data: Array.from(data)
        })
        return new Uint8Array(result)
    } catch (err) {
        console.error('hash160 error:', err)
        throw err
    }
}

/**
 * Generate cryptographically secure random bytes using Rust backend
 */
export async function randomBytes(length: number): Promise<Uint8Array> {
    try {
        const result = await invoke<number[]>('random_bytes', {
            length
        })
        return new Uint8Array(result)
    } catch (err) {
        console.error('randomBytes error:', err)
        throw err
    }
}

// Export as a unified crypto service
export const cryptoService = {
    hash160,
    randomBytes,
}

export default cryptoService
