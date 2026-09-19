// src/stores/identity/utils.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    hexHash160ToBase64,
    transformPublicKeys,
    createDefaultIdentityData,
    validateIdentityData,
    saveToStore,
    loadFromStore,
    createSDK,
    validatePrivateKeyEntry,
    validatePrivateKeyEntries
} from './utils'
import { invoke } from '@/utils/tauri'
vi.mock('@evonext/utils', () => ({
    binToHex: vi.fn((bytes: Uint8Array) =>
        Array.from(bytes).map((b: number) => b.toString(16).padStart(2, '0')).join('')
    )
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
        expect(result[0]!.data).toBe('48656c6c6f')
        expect(result[1]!.data).toBe('existing_hex_string')
        expect(result[1]!.readOnly).toBe(true)
        expect(result[1]!.keyType).toBe('Ed25519')
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
        expect(validateIdentityData({ ...valid, username: 123 } as any)).toBe(false)
    })
    it('createDefaultIdentityData should return complete object', () => {
        const data = createDefaultIdentityData('alice')
        expect(data.username).toBe('alice')
        expect(data.balance).toBe('0')
        expect(data.publicKeys).toEqual([])
    })

    // ================================================================
    // REGRESSION GUARDS for the v26.9.14 "Connection failed" bug.
    //
    // `save_keys` takes `Vec<IPrivateKeyEntry>` where EVERY field is
    // required (src-tauri/src/models.rs:150-160). These tests pin the
    // validator that guards every call site.
    // ================================================================

    describe('validatePrivateKeyEntry', () => {
        const valid = {
            identityId: 'ADtgYG2MHikwv4UiZeY8faUsEkH1YDjEnJFhGbuXLfFB',
            keyId: 0,
            purpose: 0,
            securityLevel: 0,
            keyType: 'ECDSA_HASH160',
            privateKey: 'cVtXfoMMnUCxHFLQwjVY3RpQmUJoZcpuokyHw2BQq41tzKeLXxAP',
            publicKey: 'abc123',
            createdAt: '2026-09-19T00:00:00Z',
            lastUsed: '2026-09-19T00:00:00Z'
        }

        it('accepts a complete IPrivateKeyEntry', () => {
            expect(validatePrivateKeyEntry(valid)).toEqual([])
        })

        it('rejects an entry missing lastUsed (the exact v26.9.14 bug)', () => {
            const { lastUsed, ...withoutLastUsed } = valid
            void lastUsed
            const problems = validatePrivateKeyEntry(withoutLastUsed)
            expect(problems.length).toBeGreaterThan(0)
            expect(problems.join(' ')).toContain('lastUsed')
        })

        it('rejects an entry missing ANY required field', () => {
            for (const field of Object.keys(valid)) {
                const partial: any = { ...valid }
                delete partial[field]
                const problems = validatePrivateKeyEntry(partial)
                expect(
                    problems.length,
                    `validator must reject an entry missing \`${field}\``
                ).toBeGreaterThan(0)
            }
        })

        it('rejects a public-key object from transformPublicKeys', () => {
            const publicKeys = transformPublicKeys([
                { id: 0, purpose: 0, securityLevel: 0, data: 'abc' }
            ])
            expect(publicKeys).toHaveLength(1)
            const problems = validatePrivateKeyEntry(publicKeys[0])
            expect(problems.length).toBeGreaterThan(0)
        })

        it('rejects non-objects', () => {
            expect(validatePrivateKeyEntry(null).length).toBeGreaterThan(0)
            expect(validatePrivateKeyEntry(undefined).length).toBeGreaterThan(0)
            expect(validatePrivateKeyEntry('nope').length).toBeGreaterThan(0)
            expect(validatePrivateKeyEntry([]).length).toBeGreaterThan(0)
        })

        it('rejects wrong primitive types', () => {
            expect(validatePrivateKeyEntry({ ...valid, keyId: '0' }).length).toBeGreaterThan(0)
            expect(validatePrivateKeyEntry({ ...valid, privateKey: 123 }).length).toBeGreaterThan(0)
        })
    })

    describe('validatePrivateKeyEntries', () => {
        const valid = {
            identityId: 'id',
            keyId: 0,
            purpose: 0,
            securityLevel: 0,
            keyType: 'ECDSA_HASH160',
            privateKey: 'wif',
            publicKey: 'hash',
            createdAt: 't0',
            lastUsed: 't1'
        }

        it('returns empty map for an all-valid batch', () => {
            expect(validatePrivateKeyEntries([valid, { ...valid, keyId: 1 }])).toEqual({})
        })

        it('reports the index of each invalid element', () => {
            const { lastUsed, ...bad } = valid
            void lastUsed
            const result = validatePrivateKeyEntries([valid, bad, { ...valid, keyId: 2 }])
            expect(Object.keys(result)).toEqual(['1'])
            expect((result[1] ?? []).join(' ')).toContain('lastUsed')
        })

        it('rejects a non-array argument', () => {
            expect(Object.keys(validatePrivateKeyEntries(null)).length).toBeGreaterThan(0)
            expect(Object.keys(validatePrivateKeyEntries({})).length).toBeGreaterThan(0)
        })
    })
})
