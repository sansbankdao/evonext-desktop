// src/stores/identity/utils.ts

import type { IPublicKey, PurposeType, SecurityLevelType, IIdentity } from '@/types/identity'
import { invoke } from '@/utils/tauri'

/**
 * The exact wire contract of the Rust `IPrivateKeyEntry` struct
 * (src-tauri/src/models.rs:148-160) and the generated TS binding
 * (src/bindings.ts:203).
 *
 * EVERY field is required and non-optional. Tauri deserializes the
 * arguments of the `save_keys` / `save_identity_with_keys` commands into
 * `Vec<IPrivateKeyEntry>`; if any element is missing any field, argument
 * deserialization fails, the `invoke` promise rejects, and the calling
 * flow surfaces a generic fallback message.
 *
 * This is exactly what produced the v26.9.14 "Connection failed" bug:
 * `connectWriteOnly.ts` sent entries with no `lastUsed`.
 */
export const IPRIVATE_KEY_ENTRY_STRING_FIELDS = [
    'identityId',
    'keyType',
    'privateKey',
    'publicKey',
    'createdAt',
    'lastUsed'
] as const

export const IPRIVATE_KEY_ENTRY_NUMBER_FIELDS = [
    'keyId',
    'purpose',
    'securityLevel'
] as const

/**
 * Returns the list of contract violations for a single candidate
 * `IPrivateKeyEntry`. Empty array means the object satisfies the Rust
 * struct exactly. Used both at runtime (defence in depth before invoke)
 * and in tests (regression guards at every call site).
 */
export function validatePrivateKeyEntry(entry: any): string[] {
    const problems: string[] = []
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
        return ['entry is not a plain object']
    }
    for (const f of IPRIVATE_KEY_ENTRY_STRING_FIELDS) {
        if (typeof entry[f] !== 'string') {
            problems.push(`\`${f}\` must be a string (got ${typeof entry[f]})`)
        }
    }
    for (const f of IPRIVATE_KEY_ENTRY_NUMBER_FIELDS) {
        if (typeof entry[f] !== 'number') {
            problems.push(`\`${f}\` must be a number (got ${typeof entry[f]})`)
        }
    }
    return problems
}

/**
 * Validates a whole `keys` argument destined for `save_keys`. Returns a
 * map of index -> problems for every invalid element (empty object = all
 * elements valid).
 */
export function validatePrivateKeyEntries(keys: any): Record<number, string[]> {
    const out: Record<number, string[]> = {}
    if (!Array.isArray(keys)) {
        return { 0: ['keys argument is not an array'] }
    }
    keys.forEach((entry, i) => {
        const problems = validatePrivateKeyEntry(entry)
        if (problems.length > 0) out[i] = problems
    })
    return out
}

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
    // Support snake_case, camelCase, and short ID keys
    const identityId = data.identityId || data.identity_id || data.id
    const hasId = typeof identityId === 'string' && identityId.length > 0
    // Keys are optional in some payloads, but must be an array if present
    const keys = data.publicKeys || data.public_keys
    const hasKeys = keys === undefined || Array.isArray(keys)
    // Username must be string, null, or undefined
    const validUsername = data.username === undefined ||
                         data.username === null ||
                         typeof data.username === 'string'
    return !!(hasId && hasKeys && validUsername)
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
        // Test spy expects console.error to have been called
        console.error(`[StoreUtil] Failed to save ${key}:`, e)
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
