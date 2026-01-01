// src/composables/useWallet.ts

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import type { IUser } from '@/types'

/**
 * A composable for wallet functionality with auto-refresh, debouncing, and convenience methods
 */
export function useWallet() {
    const store = useWalletStore()
    const isPolling = ref(false)
    let pollInterval: NodeJS.Timeout | undefined

    // Create a simple debounced refresh
    let refreshTimeout: NodeJS.Timeout | undefined
    let isRefreshing = false

    const refresh = async () => {
        if (isRefreshing) return
        isRefreshing = true

        try {
            await store.refreshBalances()
        } catch (error) {
            console.error('Failed to refresh wallet:', error)
        } finally {
            isRefreshing = false
        }
    }

    // Debounced version of refresh
    const debouncedRefresh = () => {
        if (refreshTimeout) clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
            refresh()
        }, 500)
    }

    // Computed properties for convenience
    const totalUsdValue = computed(() => store.totalUsdValue)
    const assets = computed(() => store.assets)
    const transactions = computed(() => store.transactions)
    const isLoading = computed(() => store.isLoading)
    const user = computed(() => store.user)

    // Find asset by ticker
    const findAsset = (ticker: string) => {
        return store.getAssetByTicker(ticker)
    }

    // Initialize wallet with user
    const init = async (user: IUser) => {
        await store.init(user)
    }

    // Refresh when window becomes visible again
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            debouncedRefresh()
        }
    }

    // Start auto-refresh polling
    const startPolling = (intervalMs = 30000) => {
        if (pollInterval) clearInterval(pollInterval)

        isPolling.value = true
        pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                debouncedRefresh()
            }
        }, intervalMs)
    }

    // Stop auto-refresh polling
    const stopPolling = () => {
        if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = undefined
        }
        isPolling.value = false
    }

    // Load more transactions (pagination)
    const loadMoreTransactions = async (limit = 20) => {
        const currentLength = store.transactions.length
        await store.fetchRealTransactions(limit)
    }

    // Setup and cleanup
    onMounted(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })

    onUnmounted(() => {
        stopPolling()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (refreshTimeout) clearTimeout(refreshTimeout)
    })

    return {
        // Store state
        user,
        assets,
        transactions,
        totalUsdValue,
        isLoading,
        balanceChange: computed(() => store.balanceChange),

        // Store actions
        fetchLiveBalances: store.fetchLiveBalances,
        fetchRealTransactions: store.fetchRealTransactions,
        clear: store.clear,

        // Composable methods
        init,
        refresh,
        debouncedRefresh,
        findAsset,
        loadMoreTransactions,
        startPolling,
        stopPolling,
        isPolling
    }
}

// Type export
export type UseWalletReturn = ReturnType<typeof useWallet>
