// src/composables/useWallet.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useWallet } from './useWallet'
import { ref } from 'vue'
const mockRefreshBalances = vi.fn()
const mockFetchRealTransactions = vi.fn()
const mockGetTokenBalance = vi.fn().mockResolvedValue(1000n)
const mockRefreshIdentity = vi.fn()
const mockPlatformInit = vi.fn()
const mockKeyInit = vi.fn()
const mockSendCredits = vi.fn().mockResolvedValue({ success: true })
const mockSendToken = vi.fn().mockResolvedValue({ success: true })
const mockWithdrawDash = vi.fn().mockResolvedValue({ success: true })
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
        sendCredits: mockSendCredits,
        sendToken: mockSendToken,
        withdrawDash: mockWithdrawDash
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
    it('manages polling lifecycle and visibility', async () => {
        const { startPolling, stopPolling, isPolling } = useWallet()
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => 'visible'
        })
        startPolling(5000)
        await Promise.resolve()
        vi.advanceTimersByTime(5000)
        await Promise.resolve()
        expect(mockRefreshBalances).toHaveBeenCalled()
        expect(isPolling.value).toBe(true)
        stopPolling()
        expect(isPolling.value).toBe(false)
    })
    it('skips refresh when document is hidden', async () => {
        const { startPolling } = useWallet()
        Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => 'hidden'
        })
        startPolling(5000)
        await Promise.resolve()
        vi.advanceTimersByTime(5000)
        await Promise.resolve()
        // Initial call only
        expect(mockRefreshBalances).toHaveBeenCalledTimes(1)
    })
    it('debounces the refresh call', async () => {
        const { debouncedRefresh } = useWallet()
        debouncedRefresh()
        debouncedRefresh()
        expect(mockRefreshBalances).not.toHaveBeenCalled()
        vi.advanceTimersByTime(1000)
        await Promise.resolve()
        expect(mockRefreshBalances).toHaveBeenCalledTimes(1)
    })
    it('handles transaction success events', async () => {
        const { refresh } = useWallet()
        const event = new Event('transaction:success')
        window.dispatchEvent(event)
        vi.advanceTimersByTime(2000)
        await Promise.resolve()
        expect(mockRefreshBalances).toHaveBeenCalled()
    })
    it('wraps transaction operations', async () => {
        const { sendCredit, sendTokenTransfer, withdrawDash } = useWallet()
        await sendCredit('id', 0, 'rx', 100n)
        expect(mockSendCredits).toHaveBeenCalled()
        await sendTokenTransfer('id', 0, 't1', 'rx', 50n)
        expect(mockSendToken).toHaveBeenCalled()
        await withdrawDash('id', 'addr', 1.0)
        expect(mockWithdrawDash).toHaveBeenCalled()
    })
})
