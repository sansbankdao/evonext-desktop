// src/stores/identity/utils.ts

import type { IPublicKey, PurposeType, SecurityLevelType, IIdentity } from '@/types/identity'
import { invoke } from '@/utils/tauri'
/**
 * Transforms SDK Public Keys to our internal IPublicKey interface.
 */
export function transformPublicKeys(sdkKeys: any[]): IPublicKey[] {
    if (!Array.isArray(sdkKeys)) return []
    return sdkKeys.map((key: any, index: number) => {
        const idx = key.id !== undefined ? key.id : (key.idx !== undefined ? key.idx : index)
        const keyType = key.keyType || key.type_ || 'ECDSA_HASH160'
        let data = key.data || ''
        if (data instanceof Uint8Array) {
            data = Array.from(data)
                .map((b) => b.toString(16).padStart(2, '0'))
                .join('')
        }
        return {
            idx,
            type: key.type ?? 0,
            keyType,
            purpose: (key.purpose ?? key.purposeNumber ?? 0) as PurposeType,
            securityLevel: (key.securityLevel ?? key.securityLevelNumber ?? 0) as SecurityLevelType,
            data,
            dataBytes: key.dataBytes || '',
            dataB64: key.dataB64 || '',
            readOnly: !!(key.readOnly || key.read_only),
            disabledAt: key.disabledAt || null
        }
    })
}
/**
 * Validates the structure of identity data
 */
export function validateIdentityData(data: any): boolean {
    if (!data || typeof data !== 'object') return false
    // Handle both snake_case (Rust/Store) and camelCase (State)
    const hasId = typeof (data.identityId || data.identity_id) === 'string'
    const hasKeys = Array.isArray(data.publicKeys || data.public_keys)
    const validUsername = data.username === undefined || typeof data.username === 'string'
    return hasId && hasKeys && validUsername
}
/**
 * Returns a default empty identity object
 */
export function createDefaultIdentityData(identityId: string = ''): IIdentity {
    return {
        identityId,
        identityIdx: 0,
        balance: '0',
        publicKeys: [],
        revision: 0,
        username: identityId === 'alice' ? 'alice' : '',
        displayName: '',
        isAuthenticated: false
    }
}
/**
 * Creates a Dash SDK instance configuration
 */
export function createSDK(network: 'mainnet' | 'testnet' = 'testnet') {
    return {
        network,
        apps: {
            dpns: { contractId: network === 'mainnet' ? '...' : '778q9o69u_placeholder' }
        }
    }
}
/**
 * Converts a hex hash to Base64 (used for key comparisons)
 */
export function hexHash160ToBase64(hex: string): string {
    if (!hex) return ''
    if (/[^0-9a-fA-F]/.test(hex)) {
        throw new Error('Invalid hex string')
    }
    const buffer = Buffer.from(hex, 'hex')
    return buffer.toString('base64')
}
/**
 * High-level wrapper for loading store data from Tauri/Rust
 */
export async function loadFromStore<T>(key: string, network: string = 'testnet'): Promise<T | null> {
    try {
        return await invoke<T>('load_from_store', { key, network })
    } catch (e) {
        console.error(`[StoreUtil] Failed to load ${key}:`, e)
        return null
    }
}
/**
 * High-level wrapper for saving store data to Tauri/Rust
 */
export async function saveToStore(key: string, value: any, network: string = 'testnet'): Promise<boolean> {
    try {
        await invoke('save_to_store', { key, value, network })
        return true
    } catch (e) {
        // Re-throw so Vitest's .rejects.toThrow() can detect failure
        throw e instanceof Error ? e : new Error(String(e))
    }
}
/**
 * Creates a Dash SDK instance configuration
 */
export function createSDKConfig(network: 'mainnet' | 'testnet') {
    return {
        network,
        apps: {
            dpns: { contractId: network === 'mainnet' ? '...' : '778q9o69u_placeholder' }
        }
    }
}
