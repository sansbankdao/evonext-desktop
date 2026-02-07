// src/composables/useWallet.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWallet } from './useWallet'
import { ref } from 'vue'

// Global Mocks
const mockRefreshBalances = vi.fn()
const mockFetchRealTransactions = vi.fn()
const mockGetTokenBalance = vi.fn().mockResolvedValue(1000n)
const mockRefreshIdentity = vi.fn()
const mockPlatformInit = vi.fn()
const mockKeyInit = vi.fn()

vi.mock('@/stores/wallet', () => ({
    useWalletStore: () => ({
        user: { id: 'u1' },
        assets: [],
        transactions: [],
        totalUsdValue: 0,
        isLoading: false,
        balanceChange: 0,
        refreshBalances: mockRefreshBalances,
        fetchRealTransactions: mockFetchRealTransactions,
        getTokenBalance: mockGetTokenBalance,
        getAssetByTicker: vi.fn(),
        clear: vi.fn()
    })
}))

const isConnected = ref(true)
vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({ isConnected: isConnected.value })
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

describe('useWallet composable', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        vi.clearAllMocks()
        isConnected.value = true
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('initializes dependencies correctly', async () => {
        const { initialize } = useWallet()
        await initialize()
        expect(mockPlatformInit).toHaveBeenCalled()
        expect(mockKeyInit).toHaveBeenCalled()
    })

    it('refreshes both identity and wallet balances', async () => {
        const { refresh } = useWallet()
        await refresh()
        expect(mockRefreshIdentity).toHaveBeenCalled()
        expect(mockRefreshBalances).toHaveBeenCalled()
    })

    it('manages polling lifecycle', () => {
        const { startPolling, stopPolling, isPolling } = useWallet()

        startPolling(5000)
        expect(isPolling.value).toBe(true)

        // Mock visibility
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => 'visible'
        })

        vi.advanceTimersByTime(5000)
        expect(mockRefreshBalances).toHaveBeenCalled()

        stopPolling()
        expect(isPolling.value).toBe(false)
    })

    it('skips refresh when document is hidden', () => {
        const { startPolling } = useWallet()
        startPolling(5000)

        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => 'hidden'
        })

        vi.advanceTimersByTime(5000)
        // Only called once by initial startPolling
        expect(mockRefreshBalances).toHaveBeenCalledTimes(1)
    })

    it('debounces the refresh call', () => {
        const { debouncedRefresh } = useWallet()
        debouncedRefresh()
        debouncedRefresh()

        expect(mockRefreshBalances).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1000)
        expect(mockRefreshBalances).toHaveBeenCalledTimes(1)
    })

    it('handles transaction success events', () => {
        const { refresh } = useWallet()
        const event = new Event('transaction:success')
        window.dispatchEvent(event)

        vi.advanceTimersByTime(2000)
        expect(mockRefreshBalances).toHaveBeenCalled()
    })

    it('wraps token balance fetching', async () => {
        const { getTokenBalance } = useWallet()
        const balance = await getTokenBalance('id', 'contract')
        expect(balance).toBe(1000n)
        expect(mockGetTokenBalance).toHaveBeenCalledWith('id', 'contract')
    })
})
