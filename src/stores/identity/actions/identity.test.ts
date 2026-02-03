// src/stores/identity/actions/identity.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '../index'
import { commands } from '@/types/rust_generated'

vi.mock('@/types/rust_generated', () => ({
    commands: {
        saveIdentity: vi.fn(),
        saveKeys: vi.fn(),
        loadKeystore: vi.fn(),
        deleteIdentity: vi.fn()
    }
}))

describe('Identity Store - Persistence & Normalization', () => {
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

        vi.mocked(commands.saveKeys).mockResolvedValue(true as any)

        await store.saveKeys('testnet', 'id_123', messyKeys)

        const callArgs = vi.mocked(commands.saveKeys).mock.calls[0]
        const sentPayload = callArgs[2][0]

        expect(sentPayload).toHaveProperty('keyId', 1)
        expect(sentPayload).toHaveProperty('privateKey', 'secret_wif')
        expect(sentPayload).toHaveProperty('securityLevel', 0)
        expect(sentPayload).not.toHaveProperty('key_id')
    })

    it('should return a failure object if validation fails (Missing Private Key)', async () => {
        const invalidKeys = [{ keyId: 0 }]

        // Use standard await because the store action catches the error
        // internally and returns a result object.
        const result = await store.saveKeys('testnet', 'id_123', invalidKeys)

        expect(result.success).toBe(false)
        expect(result.error).toContain('Missing privateKey in payload')
        expect(commands.saveKeys).not.toHaveBeenCalled()
    })

    it('should sanitize the identity payload with strict fallbacks', async () => {
        const partialPayload = { identityId: 'id_123' }

        vi.mocked(commands.saveIdentity).mockResolvedValue(true as any)

        await store.saveIdentity('testnet', partialPayload)

        const sentPayload = vi.mocked(commands.saveIdentity).mock.calls[0][1]

        expect(sentPayload.username).toBe('id_123')
        expect(sentPayload.balance).toBe('0')
        expect(sentPayload.revision).toBe(0)
    })
})
