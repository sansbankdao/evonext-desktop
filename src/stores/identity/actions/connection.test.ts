// src/stores/identity/actions/connection.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '@/stores/identity'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
}))

vi.mock('@/services/identity/discovery/DAPIService', () => ({
    DAPIService: {
        getIdentityById: vi.fn()
    }
}))

vi.mock('@/services/identity/keyDerivation.service', () => ({
    KeyDerivationService: {
        getPrivateKeyWASM: vi.fn()
    }
}))
const mockPlatformInitialize = vi.fn().mockResolvedValue({})
const mockPlatformReset = vi.fn()
vi.mock('@/composables/usePlatform', () => ({
    usePlatform: () => ({
        initialize: mockPlatformInitialize,
        reset: mockPlatformReset
    })
}))
describe('Identity Store - Connection Actions', () => {
    let store: ReturnType<typeof useIdentityStore>
    const mockMnemonic = 'test seed phrase'
    const mockIdentityId = 'id_123'
    const mockNetwork = 'mainnet' as const
    beforeEach(() => {
        setActivePinia(createPinia())
        store = useIdentityStore()
        vi.clearAllMocks()
        vi.mocked(DAPIService.getIdentityById).mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                balance: '1000',
                revision: 1,
                publicKeys: [{ id: 0, purpose: 0, securityLevel: 0, data: 'pub_key' }]
            }
        } as any)
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            privateKey: { WIF: () => 'wif_key' }
        } as any)
        // Mocking persistence actions
        store.saveMnemonicToStore = vi.fn().mockResolvedValue(undefined)
        store.saveIdentityWithKeys = vi.fn().mockResolvedValue(undefined)
    })

    describe('connectWithSeed', () => {
        it('should call atomic saveIdentityWithKeys on successful connection', async () => {
            const result = await store.connectWithSeed(
                mockMnemonic, mockNetwork, mockIdentityId, 0
            )
            expect(result.success).toBe(true)
            expect(store.saveIdentityWithKeys).toHaveBeenCalledWith(
                mockNetwork,
                expect.objectContaining({ identityId: mockIdentityId }),
                expect.any(Array)
            )
        })
        it('should fail if DAPI fetch fails', async () => {
            vi.mocked(DAPIService.getIdentityById).mockResolvedValue({
                success: false,
                error: 'Identity not found'
            } as any)
            const result = await store.connectWithSeed(
                mockMnemonic, mockNetwork, mockIdentityId
            )
            expect(result.success).toBe(false)
            expect(store.saveIdentityWithKeys).not.toHaveBeenCalled()
        })
    })
})
