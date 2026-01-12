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
        }, 1000) // Reduced to 1 second for quicker updates
    }

    const loadMoreTransactions = async (limit = 20) => {
        await store.fetchRealTransactions(limit)
    }

    // 🔥 ENHANCED: Active polling with immediate refresh
    const startPolling = (intervalMs = 30000) => {
        if (pollInterval) {
            console.log('⏱️  Polling already active')
            return
        }

        console.log(`⏱️  Starting wallet polling every ${intervalMs}ms`)

        // Immediate first refresh
        refresh()

        // Start interval
        pollInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                console.log('⏱️  Periodic wallet refresh')
                refresh()
            } else {
                console.log('⏱️  Skipping refresh (tab not visible)')
            }
        }, intervalMs)
    }

    const stopPolling = () => {
        if (pollInterval) {
            console.log('⏱️  Stopping wallet polling')
            clearInterval(pollInterval)
            pollInterval = undefined
        }
    }

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            console.log('👀 Tab became visible, refreshing wallet...')
            debouncedRefresh()
        }
    }

    // 🔥 ADD: Listen for transaction success events
    const handleTransactionSuccess = () => {
        console.log('💸 Transaction completed, refreshing wallet...')
        // Wait 2 seconds for transaction to propagate, then refresh
        setTimeout(() => refresh(), 2000)
    }

    const withdrawDash = async (
        identityId: string,
        recipientAddress: string,
        amountDash: number
    ) => {
        return await transactions.withdrawDash({
            identityId,
            recipientAddress,
            amountDash
        })
    }

    // Setup
    onMounted(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange)
        // Listen for transaction completion events
        window.addEventListener('transaction:success', handleTransactionSuccess)
    })

    onUnmounted(() => {
        stopPolling()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('transaction:success', handleTransactionSuccess)
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
        withdrawDash,

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
