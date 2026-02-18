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

const mockRouter = {
    push: vi.fn()
}

vi.mock('vue-router', () => ({
    useRouter: () => mockRouter
}))

const useTestStore = defineStore('identity', {
    state: () => ({
        identityId: null as string | null,
        isConnecting: false,
        connectionError: null as string | null,
        username: '',
        displayName: '',
        balance: '0',
        discoveryProgress: null as any,
        identities: {} as Record<string, any>,
        isConnected: false,
        isAuthenticated: false,
        publicKeys: []
    }),
    actions: {
        clearConnectionError: vi.fn(),
        saveDiscoveredIdentities: vi.fn().mockResolvedValue({ success: true }),
        connectWithSeed: vi.fn().mockResolvedValue(undefined),
        connectWithSingleKey: vi.fn().mockResolvedValue(undefined),
        switchIdentity: vi.fn(),
        saveIdentity: vi.fn().mockResolvedValue({ success: true }),
        saveKeys: vi.fn().mockResolvedValue({ success: true }),
        connectWriteOnlyFromDiscovered: vi.fn().mockResolvedValue({ success: true })
    }
})

// Helper to create valid DiscoveredIdentity
function createMockIdentity(overrides: Partial<any> = {}) {
    return {
        identityId: 'test_id',
        identityIdx: 0,
        publicKeys: [],
        balance: '0',
        ...overrides
    }
}

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

        mockManager.discoverFromSeed.mockResolvedValue({ success: true, identities: [] })
        await handlePaste(Array(24).fill('word'))
        expect(seedWordCount.value).toBe('24')
        expect(mockManager.discoverFromSeed).toHaveBeenCalled()
    })

    it('startSeedDiscovery should handle empty/invalid seeds', async () => {
        const { startSeedDiscovery, seedDiscoveryError, seedWords } = useConnect()
        seedWords.value = Array(12).fill('')

        await startSeedDiscovery()
        expect(seedDiscoveryError.value).toContain('expected 12')
    })

    it('startSeedDiscovery should handle successful discovery', async () => {
        const { startSeedDiscovery, seedDiscoveryResults, selectedSeedIdentity, seedWords } = useConnect()
        seedWords.value = Array(12).fill('word')

        const mockIdentity = createMockIdentity({ identityId: 'found_123', balance: '1000' })
        mockManager.discoverFromSeed.mockResolvedValue({
            success: true,
            identities: [mockIdentity]
        })

        await startSeedDiscovery()

        expect(seedDiscoveryResults.value).toHaveLength(1)
        expect(selectedSeedIdentity.value?.identityId).toEqual('found_123')
    })

    it('startSeedDiscovery should handle discovery failure', async () => {
        const { startSeedDiscovery, seedDiscoveryError, seedWords } = useConnect()
        seedWords.value = Array(12).fill('word')

        mockManager.discoverFromSeed.mockResolvedValue({
            success: false,
            error: 'Network timeout'
        })

        await startSeedDiscovery()

        expect(seedDiscoveryError.value).toBe('Network timeout')
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

    it('handleDiscoverIdentity should handle successful key discovery', async () => {
        const mockIdentity = createMockIdentity({
            identityId: 'key_found_123',
            balance: '2000',
            publicKeys: [{ purpose: 0, securityLevel: 0, keyType: 'ECDSA' }],
            revision: '1'
        })
        mockManager.discoverFromKey.mockResolvedValueOnce({
            success: true,
            identities: [mockIdentity]
        })

        const { handleDiscoverIdentity, discoveredIdentity, discoveryDetails } = useConnect()

        await handleDiscoverIdentity('valid-key')

        expect(discoveredIdentity.value?.identityId).toEqual('key_found_123')
        expect(discoveryDetails.value).toBeDefined()
    })

    it('handleConnect should throw on missing data for privateKey method', async () => {
        const { handleConnect, connectionMethod } = useConnect()

        connectionMethod.value = 'privateKey'
        await expect(handleConnect()).rejects.toThrow('Missing identity id')
    })

    it('handleConnect should throw on missing key for privateKey method', async () => {
        const { handleConnect, connectionMethod, manualIdentityId, discoveredIdentity } = useConnect()

        connectionMethod.value = 'privateKey'
        manualIdentityId.value = 'some_id'
        discoveredIdentity.value = createMockIdentity({ identityId: 'some_id' })
        await expect(handleConnect()).rejects.toThrow('Missing private key')
    })

    it('progressPercentage should calculate correct values', async () => {
        const store = useTestStore()
        const { progressPercentage } = useConnect()

        store.discoveryProgress = { currentIdentityIndex: 2, totalIdentities: 5, scannedCount: 0, foundCount: 0 }

        await nextTick()
        expect(progressPercentage.value).toBe(40)
    })

    it('progressPercentage should handle zero total', async () => {
        const store = useTestStore()
        const { progressPercentage } = useConnect()

        store.discoveryProgress = { currentIdentityIndex: 0, totalIdentities: 0, scannedCount: 0, foundCount: 0 }

        await nextTick()
        expect(progressPercentage.value).toBe(0)
    })

    it('cleanup should cancel discovery', () => {
        const { cleanup } = useConnect()
        cleanup()
        expect(mockManager.cancelSeedDiscovery).toHaveBeenCalled()
    })

    it('resetDiscovery should clear all state', () => {
        const { resetDiscovery, seedDiscoveryResults, discoveredIdentity } = useConnect()

        seedDiscoveryResults.value = [createMockIdentity()]
        discoveredIdentity.value = createMockIdentity()

        resetDiscovery()

        expect(seedDiscoveryResults.value).toHaveLength(0)
        expect(discoveredIdentity.value).toBeNull()
    })

    it('isFormValid should return true for seed method with selection', async () => {
        const { isFormValid, connectionMethod, selectedSeedIdentity } = useConnect()

        connectionMethod.value = 'seed'
        selectedSeedIdentity.value = createMockIdentity()

        await nextTick()
        expect(isFormValid.value).toBe(true)
    })

    it('isFormValid should return false for privateKey method without key', async () => {
        const { isFormValid, connectionMethod, manualIdentityId, discoveredIdentity } = useConnect()

        connectionMethod.value = 'privateKey'
        manualIdentityId.value = 'some_id'
        discoveredIdentity.value = null

        await nextTick()
        expect(isFormValid.value).toBe(false)
    })

    it('formatBalance should format with DASH suffix', () => {
        const { formatBalance } = useConnect()
        expect(formatBalance(1000)).toBe('1000 DASH')
    })

    it('updateConnectionMethod should reset state when switching to seed', () => {
        const { updateConnectionMethod, connectionMethod, discoveredIdentity } = useConnect()

        discoveredIdentity.value = createMockIdentity()

        updateConnectionMethod('seed')

        expect(connectionMethod.value).toBe('seed')
        expect(discoveredIdentity.value).toBeNull()
    })

    it('selectSeedIdentity should update selection', () => {
        const { selectSeedIdentity, selectedSeedIdentity, discoveredIdentity } = useConnect()

        const identity = createMockIdentity({ identityId: 'selected_123' })
        selectSeedIdentity(identity)

        expect(selectedSeedIdentity.value?.identityId).toEqual('selected_123')
        expect(discoveredIdentity.value?.identityId).toEqual('selected_123')
    })

    it('progressMessage should return formatted message during discovery', async () => {
        const store = useTestStore()
        const { progressMessage } = useConnect()

        store.discoveryProgress = { currentIdentityIndex: 1, totalIdentities: 5, scannedCount: 0, foundCount: 0 }

        await nextTick()
        expect(progressMessage.value).toContain('Checking identity 2 of 5')
    })

    it('discoveryStatus should return correct status messages', async () => {
        const { discoveryStatus, isSearchingSeed, isDiscovering } = useConnect()

        isSearchingSeed.value = true
        await nextTick()
        expect(discoveryStatus.value).toContain('Searching seed')

        isSearchingSeed.value = false
        isDiscovering.value = true
        await nextTick()
        expect(discoveryStatus.value).toContain('Searching for identity by key')

        isDiscovering.value = false
        await nextTick()
        expect(discoveryStatus.value).toBe('Idle')
    })
})
