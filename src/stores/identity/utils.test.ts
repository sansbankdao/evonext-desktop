// src/stores/identity/utils.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    hexHash160ToBase64,
    transformPublicKeys,
    createDefaultIdentityData,
    validateIdentityData,
    saveToStore,
    loadFromStore,
    createSDK
} from './utils'
import { invoke } from '@/utils/tauri'
vi.mock('@evonext/utils', () => ({
    binToHex: vi.fn((bytes) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''))
}))
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
describe('identity store utils', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
    it('hexHash160ToBase64 should convert hex to expected base64', () => {
        const hex = '48656c6c6f'
        expect(hexHash160ToBase64(hex)).toBe('SGVsbG8=')
    })
    it('hexHash160ToBase64 should throw on invalid hex input', () => {
        expect(() => hexHash160ToBase64('z')).toThrow('Invalid hex string')
    })
    it('createSDK should return a new instance', () => {
        const sdk = createSDK('testnet')
        expect(sdk).toBeDefined()
    })
    it('saveToStore should invoke tauri command and catch errors', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(invoke).mockRejectedValueOnce(new Error('Invoke Failed'))
        await expect(saveToStore('test_cmd', { data: 1 })).rejects.toThrow('Invoke Failed')
        expect(consoleSpy).toHaveBeenCalled()
        consoleSpy.mockRestore()
    })
    it('loadFromStore should return data or null on failure', async () => {
        vi.mocked(invoke).mockResolvedValueOnce({ id: 1 })
        let res = await loadFromStore('test_cmd')
        expect(res).toEqual({ id: 1 })
        vi.mocked(invoke).mockRejectedValueOnce('Error')
        res = await loadFromStore('test_cmd')
        expect(res).toBeNull()
    })
    it('transformPublicKeys should map SDK fields and handle string data', () => {
        const sdkKeys = [
            {
                type: 'ECDSA',
                purposeNumber: 0,
                securityLevelNumber: 1,
                data: new Uint8Array([72, 101, 108, 108, 111])
            },
            {
                type_: 'Ed25519',
                data: 'existing_hex_string',
                read_only: true
            }
        ]
        const result = transformPublicKeys(sdkKeys)
        expect(result[0].data).toBe('48656c6c6f')
        expect(result[1].data).toBe('existing_hex_string')
        expect(result[1].readOnly).toBe(true)
        expect(result[1].keyType).toBe('Ed25519')
    })
    it('validateIdentityData should enforce schema', () => {
        const valid = {
            username: 'bob',
            identityId: 'id1',
            identityIdx: 0,
            balance: '0',
            is_authenticated: true
        }
        expect(validateIdentityData(valid)).toBe(true)
        expect(validateIdentityData(null)).toBe(false)
        expect(validateIdentityData({ ...valid, username: 123 })).toBe(false)
    })
    it('createDefaultIdentityData should return complete object', () => {
        const data = createDefaultIdentityData('alice')
        expect(data.username).toBe('alice')
        expect(data.balance).toBe('0')
        expect(data.publicKeys).toEqual([])
    })
})
