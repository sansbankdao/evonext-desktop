// src/stores/identity/utils.ts

import type { IPublicKey, PurposeType, SecurityLevelType, IIdentity } from '@/types/identity'
import { invoke } from '@/utils/tauri'
/**
 * Transforms SDK Public Keys to our internal IPublicKey interface.
 */
export function transformPublicKeys(sdkKeys: any[]): IPublicKey[] {
    if (!Array.isArray(sdkKeys)) return []
    return sdkKeys.map((key: any) => ({
        idx: key.id !== undefined ? key.id : (key.idx !== undefined ? key.idx : 0),
        type: key.type,
        keyType: key.keyType || 'ECDSA_HASH160',
        purpose: (key.purpose ?? 0) as PurposeType,
        securityLevel: (key.securityLevel ?? 0) as SecurityLevelType,
        data: key.data || '',
        dataBytes: key.dataBytes || '',
        dataB64: key.dataB64 || '',
        readOnly: !!key.readOnly,
        disabledAt: key.disabledAt || null
    }))
}
/**
 * Validates the structure of identity data
 */
export function validateIdentityData(data: any): boolean {
    return !!(
        data &&
        typeof data.identityId === 'string' &&
        Array.isArray(data.publicKeys)
    )
}
/**
 * Returns a default empty identity object (Required by tests)
 */
export function createDefaultIdentityData(identityId: string = ''): IIdentity {
    return {
        identityId,
        identityIdx: 0,
        balance: '0',
        publicKeys: [],
        revision: 0,
        username: '',
        displayName: '',
        isAuthenticated: false
    }
}
/**
 * Creates a Dash SDK instance configuration (Required by tests)
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
        console.error(`[StoreUtil] Failed to save ${key}:`, e)
        return false
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
