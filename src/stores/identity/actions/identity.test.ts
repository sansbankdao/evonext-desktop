// src/stores/identity/actions/identity.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '../index'
import { commands } from '@/types/rust_generated'

vi.mock('@/types/rust_generated', () => ({
    commands: {
        saveIdentity: vi.fn(),
        saveKeys: vi.fn()
    }
}))

describe('Identity Store - Persistence Normalization', () => {
    let store: any

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useIdentityStore()
        vi.clearAllMocks()
    })

    it('should normalize snake_case keys from UI into camelCase for Rust', async () => {
        const messyKeys = [{
            key_id: 1,
            private_key: 'secret_wif',
            security_level: 0,
            derived_from_mnemonic: true
        }]

        vi.mocked(commands.saveKeys).mockResolvedValue({ status: 'success', data: null } as any)

        await store.saveKeys('testnet', 'id_123', messyKeys)

        // Verify the call to the Rust command used the correct camelCase
        const callArgs = vi.mocked(commands.saveKeys).mock.calls[0]
        const sentPayload = callArgs[2][0]

        expect(sentPayload).toHaveProperty('keyId', 1)
        expect(sentPayload).toHaveProperty('privateKey', 'secret_wif')
        expect(sentPayload).toHaveProperty('securityLevel', 0)
        expect(sentPayload).not.toHaveProperty('key_id')
    })

    it('should throw an explicit error if validation fails before calling Rust', async () => {
        const invalidKeys = [{ keyId: 0 }] // Missing privateKey

        await expect(
            store.saveKeys('testnet', 'id_123', invalidKeys)
        ).resolves.toMatchObject({
            success: false,
            error: expect.stringContaining('Missing privateKey')
        })

        expect(commands.saveKeys).not.toHaveBeenCalled()
    })

    it('should sanitize the identity payload with strict fallbacks', async () => {
        const partialPayload = { identityId: 'id_123' } // Missing username, balance, etc.

        vi.mocked(commands.saveIdentity).mockResolvedValue({ status: 'success', data: null } as any)

        await store.saveIdentity('testnet', partialPayload)

        const sentPayload = vi.mocked(commands.saveIdentity).mock.calls[0][1]

        expect(sentPayload.username).toBe('id_123') // Fallback logic
        expect(sentPayload.balance).toBe('0') // Strict string fallback
        expect(sentPayload.revision).toBe(0) // Strict number fallback
    })
})
