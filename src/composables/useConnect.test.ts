// src/composables/useConnect.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useConnect } from './useConnect'
import { setActivePinia, createPinia, defineStore } from 'pinia'

// 1. Fully mock the modules to prevent top-level execution errors
vi.mock('@/composables/useNotification', () => ({
    useNotification: () => ({ showSuccess: vi.fn(), showError: vi.fn() })
}))

vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({ ensure: vi.fn().mockResolvedValue('testnet') })
}))

vi.mock('@/services/identity/discovery/IdentityManager', () => ({
    getIdentityManager: () => ({
        discoverFromSeed: vi.fn(),
        discoverFromKey: vi.fn(),
        setProgressCallback: vi.fn(),
        cancelSeedDiscovery: vi.fn()
    })
}))

// 2. Define a Test Store that satisfies storeToRefs naturally
const useTestStore = defineStore('identity', {
    state: () => ({
        identityId: 'mock_id',
        isConnecting: false,
        connectionError: null,
        username: 'shomari',
        discoveryProgress: null
    }),
    actions: {
        clearConnectionError: vi.fn(),
        saveDiscoveredIdentities: vi.fn(),
        connectWithSeed: vi.fn(),
        connectWithSingleKey: vi.fn(),
        switchIdentity: vi.fn()
    }
})

vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => useTestStore()
}))

describe('useConnect Composable', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('should initialize with default values', () => {
        const { seedWordCount, isConnecting } = useConnect()
        expect(seedWordCount.value).toBe('12')
        expect(isConnecting.value).toBe(false)
    })

    it('formatBalance should handle null and numbers', () => {
        const { formatBalance } = useConnect()
        expect(formatBalance(100000000)).toBe('1.0000')
        expect(formatBalance(null)).toBe('0.0000')
    })

    it('updateConnectionMethod should toggle state', () => {
        const { connectionMethod, updateConnectionMethod } = useConnect()
        updateConnectionMethod('privateKey')
        expect(connectionMethod.value).toBe('privateKey')
    })
})
