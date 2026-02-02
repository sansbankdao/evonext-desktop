// src/stores/identity/identity.test.ts

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useIdentityStore } from './index'
import { commands } from '@/types/rust_generated'
import type { IPrivateKeyEntry, ISaveIdentityPayload } from '@/types/rust_generated'

vi.mock('@/types/rust_generated', () => ({
    commands: {
        saveIdentity: vi.fn(),
        saveKeys: vi.fn(),
        loadKeystore: vi.fn()
    }
}))

describe('Identity Store Actions', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('correctly formats keys for the saveKeys command', async () => {
        const store = useIdentityStore()
        const testId = 'test-identity-123'

        const validKey: IPrivateKeyEntry = {
            identityId: testId,
            keyId: 0,
            purpose: 3,
            securityLevel: 0,
            keyType: 'ECDSA_SECP256K1',
            privateKey: 'secret_data',
            publicKey: 'public_data',
            derivedFromMnemonic: true,
            createdAt: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        }

        // @ts-ignore
        commands.saveKeys.mockResolvedValue({ status: 'success', data: null })

        await store.saveKeys('testnet', testId, [validKey])

        expect(commands.saveKeys).toHaveBeenCalledWith(
            'testnet',
            testId,
            expect.arrayContaining([expect.objectContaining({ keyId: 0 })])
        )
    })

    it('ensures non-nullable fields are initialized during saveIdentity', async () => {
        const store = useIdentityStore()

        // @ts-ignore
        commands.saveIdentity.mockResolvedValue({ status: 'success', data: { identityId: 'id_123' } })

        // Mock a payload where fields like username or balance might be missing
        const partialPayload = {
            identityId: 'id_123',
            // Missing username, balance, revision, and publicKeys
        }

        // @ts-ignore - explicitly testing store logic resilience
        await store.saveIdentity('testnet', partialPayload)

        // Verify that the command was called with mandatory defaults
        expect(commands.saveIdentity).toHaveBeenCalledWith(
            'testnet',
            expect.objectContaining({
                identityId: 'id_123',
                username: expect.any(String), // Should fallback to identityId
                balance: expect.stringMatching('0'), // Should default to '0'
                revision: expect.any(Number), // Should default to 0
                publicKeys: expect.any(Array) // Should be []
            } as ISaveIdentityPayload)
        )
    })

    it('successfully syncs non-nullable state into the store', async () => {
        const store = useIdentityStore()
        const payload: ISaveIdentityPayload = {
            identityId: 'id_123',
            username: 'alice',
            balance: '500',
            revision: 5,
            publicKeys: [],
            identityIdx: 0,
            dpnsUsername: null,
            createdAt: new Date().toISOString(),
            activeIdentityId: 'id_123'
        }

        // @ts-ignore
        commands.saveIdentity.mockResolvedValue({ status: 'success', data: { identityId: 'id_123' } })

        await store.saveIdentity('testnet', payload)

        const identityInStore = store.identities['id_123']
        expect(identityInStore.username).toBe('alice')
        expect(identityInStore.balance).toBe('500')
        expect(identityInStore.revision).toBe(5)
    })
})
