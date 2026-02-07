// src/composables/useWallet.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWallet } from './useWallet'
import { ref } from 'vue'

// 1. Define ALL mocks in outer scope
const mockRefreshBalances = vi.fn().mockResolvedValue(true)
const mockRefreshIdentity = vi.fn().mockResolvedValue(true)
const mockPlatformInit = vi.fn().mockResolvedValue(true)
const mockKeyInit = vi.fn().mockResolvedValue(true)
const mockGetTokenBalance = vi.fn().mockResolvedValue(1000)
const mockFetchRealTransactions = vi.fn().mockResolvedValue([])

vi.mock('@/stores/wallet', () => ({
    useWalletStore: () => ({
        // FIX: Changed 'id' to 'identityId' to match the test assertion and IUser type
        user: { identityId: 'u1' },
        assets: [],
        transactions: [],
        isLoading: false,
        totalUsdValue: 0,
        balanceChange: 0,
        refreshBalances: mockRefreshBalances,
        getTokenBalance: mockGetTokenBalance,
        getAssetByTicker: vi.fn(),
        clear: vi.fn(),
        fetchRealTransactions: mockFetchRealTransactions
    })
}))

vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({ isConnected: true })
}))

vi.mock('./usePlatform', () => ({
    usePlatform: () => ({ initialize: mockPlatformInit })
}))

vi.mock('./useKeyManagement', () => ({
    useKeyManagement: () => ({
        initialize: mockKeyInit,
        getTransferKey: vi.fn(),
        getAuthKey: vi.fn()
    })
}))

vi.mock('./useIdentity', () => ({
    useIdentity: () => ({ refreshIdentity: mockRefreshIdentity })
}))

vi.mock('./useTransactions', () => ({
    useTransactions: () => ({
        sendCredits: vi.fn().mockResolvedValue({ success: true }),
        sendToken: vi.fn().mockResolvedValue({ success: true }),
        withdrawDash: vi.fn().mockResolvedValue({ success: true })
    })
}))

vi.mock('./useNetwork', () => ({
    useNetwork: () => ({ network: ref('testnet') })
}))

// Force Lifecycle to execute and capture listeners
const listeners: Record<string, Function> = {}

vi.mock('vue', async () => {
    const actual = await vi.importActual('vue')
    return {
        ...actual,
        onMounted: (fn: any) => fn(),
        onUnmounted: (fn: any) => fn()
    }
})

describe('useWallet composable complete suite', () => {
    let instance: ReturnType<typeof useWallet>

    beforeEach(() => {
        vi.useFakeTimers()
        vi.clearAllMocks()

        // Capture event listeners
        vi.spyOn(window, 'addEventListener').mockImplementation((event, fn) => {
            listeners[event as string] = fn as Function
        })
        vi.spyOn(document, 'addEventListener').mockImplementation((event, fn) => {
            listeners[event as string] = fn as Function
        })

        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => 'visible'
        })

        instance = useWallet()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('initializes dependencies correctly', async () => {
        await instance.initialize()
        expect(mockPlatformInit).toHaveBeenCalled()
        expect(mockKeyInit).toHaveBeenCalled()
    })

    it('refreshes on transaction success event', async () => {
        const handler = listeners['transaction:success']
        if (!handler) throw new Error('Transaction success listener not registered')

        handler()

        // Source uses 2000ms delay: setTimeout(() => refresh(), 2000)
        await vi.advanceTimersByTimeAsync(2000)

        expect(mockRefreshBalances).toHaveBeenCalled()
    })

    it('refreshes on visibility change if visible', async () => {
        const handler = listeners['visibilitychange']
        if (!handler) throw new Error('Visibility change listener not registered')

        handler()

        // Source uses debouncedRefresh which is 1000ms
        await vi.advanceTimersByTimeAsync(1000)

        expect(mockRefreshBalances).toHaveBeenCalled()
    })

    it('manages polling lifecycle', async () => {
        instance.startPolling(5000)

        // Initial refresh inside startPolling
        await vi.advanceTimersByTimeAsync(0)

        // Advance to first interval
        await vi.advanceTimersByTimeAsync(5000)

        expect(mockRefreshBalances.mock.calls.length).toBeGreaterThanOrEqual(2)

        instance.stopPolling()
    })

    it('provides asset and transaction state', () => {
        expect(instance.user.value?.identityId).toBe('u1')
        expect(instance.network.value).toBe('testnet')
    })
})
