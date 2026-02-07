// src/composables/useConnect.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConnect } from './useConnect'
import { setActivePinia, createPinia, defineStore } from 'pinia'
import { nextTick } from 'vue'

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
        clearConnectionError: vi.fn(),
        saveDiscoveredIdentities: vi.fn().mockResolvedValue({ success: true }),
        connectWithSeed: vi.fn().mockResolvedValue(undefined),
        connectWithSingleKey: vi.fn().mockResolvedValue(undefined),
        switchIdentity: vi.fn()
    }
})

describe('useConnect - Coverage Boost', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('watch seedWordCount should resize seedWords array', async () => {
        const { seedWordCount, seedWords } = useConnect()

        seedWordCount.value = '24'
        await nextTick()
        expect(seedWords.value.length).toBe(24)

        seedWordCount.value = '12'
        await nextTick()
        expect(seedWords.value.length).toBe(12)
    })

    it('handlePaste should validate length and auto-trigger discovery', async () => {
        const { handlePaste, seedDiscoveryError, seedWordCount } = useConnect()

        await handlePaste(Array(15).fill('word'))
        expect(seedDiscoveryError.value).toContain('Invalid seed phrase length')

        await handlePaste(Array(24).fill('word'))
        expect(seedWordCount.value).toBe('24')
        expect(mockManager.discoverFromSeed).toHaveBeenCalled()
    })

    it('startSeedDiscovery should handle empty/invalid seeds', async () => {
        const { startSeedDiscovery, seedDiscoveryError, seedWords } = useConnect()
        seedWords.value = Array(12).fill('') // empty

        await startSeedDiscovery()
        expect(seedDiscoveryError.value).toContain('expected 12')
    })

    it('handleDiscoverIdentity should handle failure results', async () => {
        mockManager.discoverFromKey.mockResolvedValueOnce({
            success: false,
            error: 'Identity not found'
        })
        const { handleDiscoverIdentity, privateKeyDiscoveryError } = useConnect()

        await handleDiscoverIdentity('some-key')
        expect(privateKeyDiscoveryError.value).toBe('Identity not found')
    })

    it('handleConnect should throw on missing data', async () => {
        const { handleConnect, connectionMethod } = useConnect()

        connectionMethod.value = 'privateKey'
        // manualIdentityId is empty
        await expect(handleConnect()).rejects.toThrow('Missing identity id')
    })

    it('progressPercentage should calculate correct values', async () => {
        const store = useTestStore()
        const { progressPercentage } = useConnect()

        store.discoveryProgress = { currentIdentityIndex: 2, totalIdentities: 5, message: '' } as any

        await nextTick()
        expect(progressPercentage.value).toBe(40)
    })

    it('cleanup should cancel discovery', () => {
        const { cleanup } = useConnect()
        cleanup()
        expect(mockManager.cancelSeedDiscovery).toHaveBeenCalled()
    })
})
