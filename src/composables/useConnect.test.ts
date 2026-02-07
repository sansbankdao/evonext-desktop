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

vi.mock('@/composables/usePlatform', () => ({
    usePlatform: () => ({ reset: vi.fn().mockResolvedValue(undefined) })
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
        clearConnectionError() {},
        saveDiscoveredIdentities() { return Promise.resolve({ success: true }) },
        connectWithSeed() { return Promise.resolve() },
        connectWithSingleKey() { return Promise.resolve() },
        switchIdentity() {}
    }
})

describe('useConnect - Final Consolidated', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('handleConnect should trigger seed-based connection and use spy correctly', async () => {
        const store = useTestStore()
        const connectSpy = vi.spyOn(store, 'connectWithSeed')

        const { handleConnect, connectionMethod, selectedSeedIdentity, seedWords } = useConnect()

        connectionMethod.value = 'seed'
        selectedSeedIdentity.value = { identityId: 'id1', identityIdx: 0 } as any
        seedWords.value = Array(12).fill('word')

        await handleConnect()

        expect(connectSpy).toHaveBeenCalledWith(
            expect.stringContaining('word'),
            'testnet',
            'id1',
            0
        )
    })

    it('updateConnectionMethod should clear errors using spy', () => {
        const store = useTestStore()
        const clearSpy = vi.spyOn(store, 'clearConnectionError')

        const { updateConnectionMethod } = useConnect()
        updateConnectionMethod('privateKey')

        expect(clearSpy).toHaveBeenCalled()
    })

    it('formatBalance should handle various input types', () => {
        const { formatBalance } = useConnect()
        expect(formatBalance(100000000)).toBe('1.0000')
        expect(formatBalance(null)).toBe('0.0000')
        expect(formatBalance(undefined)).toBe('0.0000')
    })

    it('isFormValid should correctly validate seed selection', () => {
        const { isFormValid, selectedSeedIdentity, connectionMethod } = useConnect()
        connectionMethod.value = 'seed'
        expect(isFormValid.value).toBe(false)
        selectedSeedIdentity.value = { identityId: 'id' } as any
        expect(isFormValid.value).toBe(true)
    })
})
