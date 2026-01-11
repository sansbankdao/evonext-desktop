// src/composables/useWallet.ts
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { usePlatform } from './usePlatform'
import { useTransactions } from './useTransactions'
import { useKeyManagement } from './useKeyManagement'
import { useNetwork } from './useNetwork'
import type { ITransactionResult } from '@/types'
// Local type definitions for missing exports
interface SendCreditParams {
    identityId: string
    identityIdx: number
    receiver: string
    credits: bigint
    privateKey?: string
}
interface SendTokenParams {
    identityId: string
    identityIdx: number
    tokenId: string
    receiver: string
    atomicUnits: bigint
    privateKey?: string
}
interface WalletTransactionResult extends ITransactionResult {
    debugLog?: string[]
}
// interface ITxSuccess {
//     txid: string
//     message?: string
// }
// interface ITxError {
//     code: number
//     message: string
//     step?: string
//     suggestions?: string[]
// }
export function useWallet() {
    const store = useWalletStore()
    const platform = usePlatform()
    const transactions = useTransactions()
    const keys = useKeyManagement()
    const { network } = useNetwork()
    const loading = ref(false)
    const error = ref<string | null>(null)
    let pollInterval: NodeJS.Timeout | undefined
    let refreshTimeout: NodeJS.Timeout | undefined
    let isRefreshing = false
    const initialize = async (): Promise<void> => {
        loading.value = true
        error.value = null
        try {
            await platform.initialize()
            await keys.initialize()
            loading.value = false
        } catch (err: any) {
            error.value = err.message || 'Failed to initialize wallet'
            loading.value = false
            throw err
        }
    }
    // Balance operations
    // FIX: getTokenBalance signature updated to accept network
    const getTokenBalance = async (identityId: string, contractId: string): Promise<bigint> => {
        const balance = await store.getTokenBalance(identityId, contractId)
        return BigInt(balance)
    }
    // Transaction operations
    const sendCredits = async (params: SendCreditParams): Promise<WalletTransactionResult> => {
        const result = await transactions.sendCredits(params)
        return result as WalletTransactionResult
    }
    const sendToken = async (params: SendTokenParams): Promise<WalletTransactionResult> => {
        const result = await transactions.sendToken(params)
        return result as WalletTransactionResult
    }
    // FIX: Pass identityId (String) to sendCredits
    // Note: The signature of useTransactions.sendCredits is (identityId: string, identityIdx: number, ...)
    const sendCredit = async (
        identityId: string,
        identityIdx: number,
        receiver: string,
        credits: bigint,
        privateKey?: string
    ): Promise<WalletTransactionResult> => {
        const params: SendCreditParams = {
            identityId,
            identityIdx,
            receiver,
            credits,
            ...(privateKey !== undefined ? { privateKey } : {})
        }
        return await sendCredits(params)
    }
    // FIX: Pass identityId (String) to sendTokenTransfer
    const sendTokenTransfer = async (
        identityId: string,
        identityIdx: number,
        tokenId: string,
        receiver: string,
        atomicUnits: bigint,
        privateKey?: string
    ): Promise<WalletTransactionResult> => {
        const params: SendTokenParams = {
            identityId,
            identityIdx,
            tokenId,
            receiver,
            atomicUnits,
            ...(privateKey !== undefined ? { privateKey } : {})
        }
        return await sendToken(params)
    }
    // Store operations
    const refresh = async () => {
        if (isRefreshing) return
        isRefreshing = true
        error.value = null
        try {
            await store.refreshBalances()
        } catch (err: any) {
            error.value = err.message || 'Failed to refresh wallet'
        } finally {
            isRefreshing = false
        }
    }
    const debouncedRefresh = () => {
        if (refreshTimeout) clearTimeout(refreshTimeout)
        refreshTimeout = setTimeout(() => {
            refresh()
        }, 500)
    }
    const loadMoreTransactions = async (limit = 20) => {
        await store.fetchRealTransactions(limit)
    }
    // Polling
    const startPolling = (intervalMs = 30000) => {
        if (pollInterval) clearInterval(pollInterval)
        pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                debouncedRefresh()
            }
        }, intervalMs)
    }
    const stopPolling = () => {
        if (pollInterval) {
            clearInterval(pollInterval)
            pollInterval = undefined
        }
    }
    // Visibility
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            debouncedRefresh()
        }
    }
    // Setup
    onMounted(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })
    onUnmounted(() => {
        stopPolling()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        if (refreshTimeout) clearTimeout(refreshTimeout)
    })
    return {
        // State
        user: computed(() => store.user),
        assets: computed(() => store.assets),
        transactions: computed(() => store.transactions),
        totalUsdValue: computed(() => store.totalUsdValue),
        isLoading: computed(() => store.isLoading || loading.value),
        balanceChange: computed(() => store.balanceChange),
        error: computed(() => error.value),
        isPolling: computed(() => !!pollInterval),
        // Platform
        platform,
        // Actions
        initialize,
        refresh,
        debouncedRefresh,
        loadMoreTransactions,
        startPolling,
        stopPolling,
        clear: store.clear,
        // Core operations
        getTokenBalance,
        sendCredits,
        sendToken,
        sendCredit,
        sendTokenTransfer,
        // Store proxies
        fetchLiveBalances: store.fetchLiveBalances,
        fetchRealTransactions: store.fetchRealTransactions,
        findAsset: (ticker: string) => store.getAssetByTicker(ticker),
        // Network
        network: computed(() => network.value),
        // Keys
        getTransferKey: keys.getTransferKey,
        getAuthKey: keys.getAuthKey
    }
}
// Type export
export type UseWalletReturn = ReturnType<typeof useWallet>
