// src/stores/identity/utils.test.ts

import { describe, it, expect, vi } from 'vitest'
import {
    hexHash160ToBase64,
    transformPublicKeys,
    createDefaultIdentityData,
    validateIdentityData
} from './utils'
vi.mock('@evonext/utils', () => ({
    binToHex: vi.fn((bytes) => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''))
}))
describe('identity store utils', () => {
    it('hexHash160ToBase64 should convert hex to expected base64', () => {
        const hex = '48656c6c6f'
        expect(hexHash160ToBase64(hex)).toBe('SGVsbG8=')
    })
    it('transformPublicKeys should map SDK fields to app fields', () => {
        const sdkKeys = [
            {
                type: 'ECDSA',
                purposeNumber: 0,
                securityLevelNumber: 1,
                data: new Uint8Array([72, 101, 108, 108, 111])
            }
        ]
        const result = transformPublicKeys(sdkKeys)
        expect(result[0].purpose).toBe(0)
        expect(result[0].securityLevel).toBe(1)
        expect(result[0].data).toBe('48656c6c6f')
    })
    it('createDefaultIdentityData should return complete object', () => {
        const data = createDefaultIdentityData('alice')
        expect(data.username).toBe('alice')
        expect(data.balance).toBe('0')
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
        expect(validateIdentityData({ ...valid, username: 123 })).toBe(false)
    })
})
