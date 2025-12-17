// src/stores/identity/utils.ts

import { invoke } from '@tauri-apps/api/core'
import { DashPlatformSDK } from 'dash-platform-sdk'
import type { IdentityData, IdentityPublicKey } from '@/types'
/**
 * Convert hex string to base64
 */
export function hexHash160ToBase64(hex: string): string {
    const matches = hex.match(/.{2}/g)
    if (!matches) throw new Error(`Invalid hex string: ${hex}`)
    const bytes = new Uint8Array(matches.map(byte => parseInt(byte, 16)))
    return btoa(String.fromCharCode(...Array.from(bytes)))
}
/**
 * Create SDK instance for network
 */
export function createSDK(network: 'testnet' | 'mainnet'): DashPlatformSDK {
    return new DashPlatformSDK({ network })
}
/**
 * Save data to Tauri store with error handling
 */
export async function saveToStore<T>(command: string, payload: T): Promise<void> {
    try {
        await invoke(command, { payload })
    } catch (error) {
        console.error(`Failed to save to ${command}:`, error)
        throw error
    }
}
/**
 * Load data from Tauri store with error handling
 */
export async function loadFromStore<T>(command: string): Promise<T | null> {
    try {
        const data = await invoke<T>(command)
        return data || null
    } catch (error) {
        console.error(`Failed to load from ${command}:`, error)
        return null
    }
}
/**
 * Transform SDK public keys to IdentityPublicKey format
 */
export function transformPublicKeys(sdkKeys: any[], identityIdx: number): IdentityPublicKey[] {
    return sdkKeys.map((key: any, index: number) => ({
        type_: key.type_ || key.keyType || 'ecdsa',
        purpose: Number(key.purpose || key.purposeNumber || 0),
        security_level: Number(key.security_level || key.securityLevelNumber || 0),key.data || hexHash160ToBase64(key.dataBytes || key.data || ''),
        read_only: Boolean(key.read_only || key.readOnly || false),
        disabled_at: key.disabled_at || key.disabledAt || null,
        created_at: key.created_at || new Date().toISOString()
    }))
}
/**
 * Validate identity data
 */
export function validateIdentityData(data: any): boolean {
    return !!(
        data &&
        typeof data.identity_id === 'string' &&
        data.identity_id.length > 0 &&
        typeof data.identity_idx === 'number'
    )
}
/**
 * Create default identity data
 */
export function createDefaultIdentityData(username: string = ''): IdentityData {
    return {
        username,
        identity_id: '',
        identity_idx: 0,
        balance: null,
        is_authenticated: false,
        public_keys: null,
        revision: null,
        created_at: null,
        public_key_ids: null
    }
}
