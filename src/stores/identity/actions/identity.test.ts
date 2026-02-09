// src/stores/identity/actions/identity.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '../index'
import { commands } from '@/bindings'
vi.mock('@/bindings', () => ({
    commands: {
        saveIdentity: vi.fn(),
        saveKeys: vi.fn(),
        loadKeystore: vi.fn(),
        deleteIdentity: vi.fn()
    }
}))
vi.mock('@/composables/useIdentity', () => ({
    useIdentity: () => ({
        searchUserIdentities: vi.fn().mockResolvedValue({
            success: true,
            data: [{ identityId: 'discovered_1' }]
        }),
        queryIdentityDetails: vi.fn().mockResolvedValue({
            success: true,
            data: { balance: '999', publicKeys: [{ id: 1 }] }
        })
    })
}))
describe('Identity Store - Persistence & Normalization', () => {
    let store: any
    beforeEach(() => {
        setActivePinia(createPinia())
        store = useIdentityStore()
        // Initialization is critical: the action checks 'if (this.keystore)'
        store.keystore = { identities: {} }
        vi.clearAllMocks()
    })
    it('should normalize snake_case keys from UI into camelCase for Rust', async () => {
        const messyKeys = [{
            key_id: 1,
            private_key: 'secret_wif',
            security_level: 0,
            derived_from_mnemonic: true
        }]
        vi.mocked(commands.saveKeys).mockResolvedValue({
            status: 'success',
            data: true
        } as any)
        await store.saveKeys('testnet', 'id_123', messyKeys)
        const callArgs = vi.mocked(commands.saveKeys).mock.calls[0]
        // Ensure we handle the potentially undefined callArgs for TS
        const sentKeys = (callArgs as any)?.[2] || []
        expect(sentKeys[0]).toHaveProperty('keyId', 1)
        expect(sentKeys[0]).toHaveProperty('privateKey', 'secret_wif')
    })
    describe('loadKeystore', () => {
        it('should update store keystore on success', async () => {
            const mockKeystoreData = { identities: { 'id_1': [] } }
            // FIX: We must explicitly map to the 'data' property
            vi.mocked(commands.loadKeystore).mockResolvedValue({
                status: 'success',
                data: mockKeystoreData
            } as any)
            const result = await store.loadKeystore('testnet')
            expect(result.success).toBe(true)
            expect(store.keystore).toEqual(mockKeystoreData)
        })
    })
    describe('Composable Actions', () => {
        it('should search user identities and update discoveredIdentities', async () => {
            await store.searchUserIdentities()
            expect(store.discoveredIdentities).toHaveLength(1)
            expect(store.discoveredIdentities[0].identityId).toBe('discovered_1')
        })
        it('should fetch public keys and return them inside data property', async () => {
            store.identityId = 'id_123'
            store.publicKeys = []
            const result = await store.getPublicKeys()
            // ErrorBoundary.wrap always returns an ActionResponse { success, data }
            expect(result.success).toBe(true)
            expect(result.data).toHaveLength(1)
            expect(result.data[0].id).toBe(1)
        })
    })
})
