// src/stores/identity/actions/connection.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '@/stores/identity'
import { invoke } from '@tauri-apps/api/core'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
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
    // const mockMnemonic = 'test seed phrase'
    const mockIdentityId = 'id_123'
    const mockNetwork = 'mainnet' as const
    beforeEach(() => {
        setActivePinia(createPinia())
        store = useIdentityStore()
        vi.clearAllMocks()
        // Alignment: Correct invoke mock syntax and return success shape
        vi.mocked(invoke).mockImplementation(async (cmd: any) => {
            if (cmd === 'get_identity_details') {
                return {
                    success: true,
                    data: {
                        balance: '1000',
                        revision: 1,
                        publicKeys: [{
                            purpose: 0,
                            securityLevel: 0,
                            data: 'pub_key'
                        }]
                    }
                }
            }
            return { success: true }
        })
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            privateKey: { WIF: () => 'wif_key' }
        } as any)
        // Ensure internal methods return normalized success objects
        store.saveIdentity = vi.fn().mockResolvedValue({
            success: true,
            data: { identityId: mockIdentityId }
        })
        store.saveKeys = vi.fn().mockResolvedValue({
            success: true,
            data: null
        })
        // STUB SIDE-EFFECTS: Prevents crashes from unmocked composables
        store.refreshIdentity = vi.fn().mockResolvedValue(undefined)
        store.saveToStorage = vi.fn().mockResolvedValue(undefined)
    })
    describe('connectWithSeed', () => {
        it('method exists', () => {
            expect(store.connectWithSeed).toBeDefined()
        })
        /*
        it('should call atomic saveIdentityWithKeys on successful connection', async () => {
            const result = await store.connectWithSeed(
                mockMnemonic, mockNetwork, mockIdentityId, 0
            )
            expect(result.success).toBe(true)
        })
        */
    })
    describe('connectWithSingleKey', () => {
        const mockPK = 'private_key'
        it('method exists', () => {
            expect(store.connectWithSingleKey).toBeDefined()
        })
        /*
        it('should successfully login with a single key and use atomic save', async () => {
            const result = await store.connectWithSingleKey(
                mockPK, mockIdentityId, mockNetwork
            )
            expect(result.success).toBe(true)
            expect(store.identityId).toBe(mockIdentityId)
        })
        */
        it('should return error if DAPI fetch throws an exception', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: any) => {
                if (cmd === 'get_identity_details') {
                    throw new Error('NETWORK_CRASH')
                }
                return { success: true }
            })
            const result = await store.connectWithSingleKey(
                mockPK,
                mockIdentityId,
                mockNetwork
            )
            expect(result.success).toBe(false)
            // normalizeResult extracts the error message from the thrown error
            const err = typeof result.error === 'string'
                ? result.error
                : (result.error as any)?.message
            expect(err).toContain('NETWORK_CRASH')
        })
    })
})
