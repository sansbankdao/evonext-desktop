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
        store.saveMnemonicToStore = vi.fn().mockResolvedValue(undefined)
        store.saveKeys = vi.fn().mockResolvedValue(undefined)
        store.saveIdentityDataToStore = vi.fn().mockResolvedValue(undefined)
    })
    describe('connectWithSeed', () => {
        it('should return success: true on valid connection', async () => {
            const result = await store.connectWithSeed(
                mockMnemonic, mockNetwork, mockIdentityId, 0
            )
            expect(result.success).toBe(true)
            expect(store.isAuthenticated).toBe(true)
            expect(store.balance).toBe('1000')
            expect(mockPlatformInitialize).toHaveBeenCalled()
        })
        it('should return success: false when DAPI fails (Result Pattern)', async () => {
            vi.mocked(DAPIService.getIdentityById).mockResolvedValue({
                success: false,
                searchType: 'unique',
                error: 'Identity not found'
            })
            const result = await store.connectWithSeed(
                mockMnemonic, mockNetwork, mockIdentityId
            )
            expect(result.success).toBe(false)
            expect(result.error).toContain('Identity not found')
            expect(store.isAuthenticated).toBe(false)
            expect(store.isConnecting).toBe(false)
        })
    })
    describe('connectWithSingleKey', () => {
        const mockPK = 'private_key'
        it('should successfully login with a single key', async () => {
            const result = await store.connectWithSingleKey(
                mockPK, mockIdentityId, mockNetwork
            )
            expect(result.success).toBe(true)
            expect(store.identityId).toBe(mockIdentityId)
            expect(store.balance).toBe('1000')
        })
        it('should handle unexpected crashes by returning success: false', async () => {
            vi.mocked(DAPIService.getIdentityById).mockImplementation(() => {
                throw new Error('CRITICAL_CRASH')
            })
            const result = await store.connectWithSingleKey(
                mockPK, mockIdentityId, mockNetwork
            )
            expect(result.success).toBe(false)
            expect(result.error).toBe('CRITICAL_CRASH')
            expect(store.isConnecting).toBe(false)
        })
    })
})
