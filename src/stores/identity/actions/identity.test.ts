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
        vi.clearAllMocks()
    })
    it('should normalize snake_case keys from UI into camelCase for Rust', async () => {
        const messyKeys = [{
            key_id: 1,
            private_key: 'secret_wif',
            security_level: 0,
            derived_from_mnemonic: true
        }]
        vi.mocked(commands.saveKeys).mockResolvedValue({ status: 'success', data: true } as any)
        await store.saveKeys('testnet', 'id_123', messyKeys)
        const callArgs = vi.mocked(commands.saveKeys).mock.calls[0]
        const sentKeys = callArgs?.[2] || []
        expect(sentKeys[0]).toHaveProperty('keyId', 1)
    })
    describe('loadKeystore', () => {
        it('should update store keystore on success', async () => {
            const mockData = { identities: { 'id_1': [] } }
            vi.mocked(commands.loadKeystore).mockResolvedValue({
                status: 'success', mockData // Action looks for .data
            } as any)
            store.keystore = {}
            await store.loadKeystore('testnet')
            expect(store.keystore).toEqual(mockData)
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
            expect(result.success).toBe(true)
            expect(result.data).toHaveLength(1)
        })
    })
})
