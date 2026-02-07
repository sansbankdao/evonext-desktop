// src/composables/useConnect.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConnect } from './useConnect'
import { setActivePinia, createPinia, defineStore } from 'pinia'
vi.mock('@/composables/useNotification', () => ({
    useNotification: () => ({ showSuccess: vi.fn(), showError: vi.fn() })
}))
vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({ ensure: vi.fn().mockResolvedValue('testnet') })
}))
const mockManager = {
    discoverFromSeed: vi.fn(),
    discoverFromKey: vi.fn(),
    setProgressCallback: vi.fn(),
    cancelSeedDiscovery: vi.fn()
}
vi.mock('@/services/identity/discovery/IdentityManager', () => ({
    getIdentityManager: () => mockManager
}))
const useTestStore = defineStore('identity', {
    state: () => ({
        identityId: null,
        isConnecting: false,
        connectionError: null,
        username: '',
        discoveryProgress: null
    }),
    actions: {
        clearConnectionError: vi.fn(),
        saveDiscoveredIdentities: vi.fn().mockResolvedValue({ success: true }),
        connectWithSeed: vi.fn(),
        connectWithSingleKey: vi.fn(),
        switchIdentity: vi.fn()
    }
})
describe('useConnect Expanded Suite', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })
    it('handlePaste should trigger discovery for 12 words', async () => {
        const { handlePaste, seedWords } = useConnect()
        mockManager.discoverFromSeed.mockResolvedValue({ success: true, identities: [] })
        const words = Array(12).fill('word')
        await handlePaste(words)
        expect(seedWords.value).toHaveLength(12)
        expect(mockManager.discoverFromSeed).toHaveBeenCalled()
    })
    it('isFormValid should correctly validate seed selection', async () => {
        const { isFormValid, selectedSeedIdentity, connectionMethod } = useConnect()
        connectionMethod.value = 'seed'
        expect(isFormValid.value).toBe(false)
        selectedSeedIdentity.value = { identityId: 'id' } as any
        expect(isFormValid.value).toBe(true)
    })
    it('isFormValid should correctly validate private key input via discovery', async () => {
        const { isFormValid, connectionMethod, manualIdentityId, handleDiscoverIdentity } = useConnect()
        connectionMethod.value = 'privateKey'
        manualIdentityId.value = 'id123'
        // Initial state is invalid because privateKeyInput is empty
        expect(isFormValid.value).toBe(false)
        // Mock successful key discovery which updates internal privateKeyInput
        mockManager.discoverFromKey.mockResolvedValue({
            success: true,
            identity: { identityId: 'id123' }
        })
        await handleDiscoverIdentity('wif_key')
        expect(isFormValid.value).toBe(true)
    })
    it('handleDiscoverIdentity should update state on success', async () => {
        const { handleDiscoverIdentity, discoveredIdentity, manualIdentityId } = useConnect()
        const mockId = { identityId: 'found_id', identityIdx: 0 }
        mockManager.discoverFromKey.mockResolvedValue({ success: true, identity: mockId })
        await handleDiscoverIdentity('some_key')
        expect(discoveredIdentity.value?.identityId).toBe('found_id')
        expect(manualIdentityId.value).toBe('found_id')
    })
})
