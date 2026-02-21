// src/stores/identity/identity.test.ts

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useIdentityStore } from './index'
import { commands } from '@/bindings'
import type { IPrivateKeyEntry, ISaveIdentityPayload } from '@/bindings'

vi.mock('@/bindings', () => ({
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
            // derivedFromMnemonic: true,
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

        const partialPayload = {
            identityId: 'id_123'
        }

        // @ts-ignore
        await store.saveIdentity('testnet', partialPayload)

        expect(commands.saveIdentity).toHaveBeenCalledWith(
            'testnet',
            expect.objectContaining({
                identityId: 'id_123',
                username: expect.any(String),
                balance: expect.stringMatching('0'),
                revision: expect.any(Number),
                publicKeys: expect.any(Array)
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

        const identityInStore = store.identities['id_123']!
        expect(identityInStore.username).toBe('alice')
        expect(identityInStore.balance).toBe('500')
        expect(identityInStore.revision).toBe(5)
    })

    it('should expose inline getters correctly', () => {
        const store = useIdentityStore()

        // isConnectedComputed
        store.identityId = null
        expect(store.isConnectedComputed).toBe(false)
        store.identityId = 'id_abc'
        expect(store.isConnectedComputed).toBe(true)

        // getGreeting
        store.displayName = 'Bob'
        expect(store.getGreeting).toBe('Hello, Bob')
        store.displayName = ''
        expect(store.getGreeting).toBe('Hello, User')

        // publicKeysCount
        store.publicKeys = []
        expect(store.publicKeysCount).toBe(0)
        store.publicKeys = [{ purpose: 0 } as any, { purpose: 1 } as any]
        expect(store.publicKeysCount).toBe(2)

        // hasPublicKeys
        expect(store.hasPublicKeys).toBe(true)
        store.publicKeys = []
        expect(store.hasPublicKeys).toBe(false)
    })

    it('should compute identity getter correctly', () => {
        const store = useIdentityStore()
        // null when no identityId
        store.identityId = null
        expect(store.identity).toBeNull()

        // returns identity from map when set
        store.identityId = 'id_x'
        store.identities = {
            'id_x': {
                identityId: 'id_x',
                balance: '999',
                username: 'test'
            } as any
        }
        expect(store.identity).toBeDefined()
        expect((store.identity as any).balance).toBe('999')
    })

    it('should compute formattedBalance from inline getter', () => {
        const store = useIdentityStore()
        store.balance = '200000000000'
        // 200000000000 / 100000000000 = 2
        expect(store.formattedBalance).toBe('2 DASH')

        store.balance = '0'
        expect(store.formattedBalance).toBe('0 DASH')

        store.balance = '50000000000'
        // 50000000000 / 100000000000 = 0.5
        expect(store.formattedBalance).toBe('0.5 DASH')
    })
})
