// src/services/crypto.ts

import { invoke } from '@/utils/tauri'

/**
 * Calculate hash160 (RIPEMD160(SHA256(data))) using Rust backend
 */
export async function hash160(
    data: Uint8Array | number[] | { buffer: ArrayBuffer }
): Promise<Uint8Array> {
    try {
        let dataArray: number[]

        // Handle different input types
        if (Array.isArray(data)) {
            dataArray = data
        } else if (data instanceof Uint8Array) {
            dataArray = Array.from(data)
        } else if (data && typeof data === 'object' && 'buffer' in data) {
            const uint8View = new Uint8Array(data.buffer)
            dataArray = Array.from(uint8View)
        } else {
            throw new Error(`[Crypto] Invalid data type passed to hash160: ${typeof data}`)
        }

        if (dataArray.length === 0) {
             console.error('[Crypto] hash160 received empty data array. Input:', data)
             throw new Error('hash160 input data is empty')
        }

        const result = await invoke<number[]>('hash160', { input: dataArray })

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
            len: length
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
