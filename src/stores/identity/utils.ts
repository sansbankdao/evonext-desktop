// src/stores/identity/utils.ts
// @ts-ignore
import { binToHex } from '@evonext/utils'
import { invoke } from '@tauri-apps/api/core'
import { DashPlatformSDK } from 'dash-platform-sdk'
import type { IIdentityData, IIdentityPublicKey } from '@/types'
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
export function transformPublicKeys(sdkKeys: any[]): IIdentityPublicKey[] {
    return sdkKeys.map((key: any, index: number) => ({
        id: index,
        type_: key.type_ || key.type || '',
        purpose: key.purpose || key.purposeNumber || 0,
        security_level: key.security_level || key.securityLevel || key.securityLevelNumber || 0,
        data: key.data || '',
        data_bytes: key.dataBytes || (key.data ? binToHex(key.data) : ''),
        read_only: key.read_only || key.readOnly || false,
        disabled_at: key.disabled_at || key.disabledAt || null,
        created_at: key.created_at || null
    }))
}
/**
 * Validate identity data
 */
export function validateIdentityData(data: any): boolean {
    return !!(
        data &&
        typeof data.username === 'string' &&
        typeof data.identity_id === 'string' &&
        typeof data.identity_idx === 'number' &&
        (data.balance === null || typeof data.balance === 'string') &&
        typeof data.is_authenticated === 'boolean'
    )
}
/**
 * Create default identity data
 */
export function createDefaultIdentityData(username: string = ''): IIdentityData {
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
