import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useIdentityStore } from '@/stores/identity'
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
    const Identity = useIdentityStore()
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
    const getTokenBalance = async (identityId: string, contractId: string): Promise<bigint> => {
        const balance = await store.getTokenBalance(identityId, contractId)
        return BigInt(balance)
    }
    const sendCredits = async (params: SendCreditParams): Promise<WalletTransactionResult> => {
        const result = await transactions.sendCredits(params)
        return result as WalletTransactionResult
    }
    const sendToken = async (params: SendTokenParams): Promise<WalletTransactionResult> => {
        const result = await transactions.sendToken(params)
        return result as WalletTransactionResult
    }
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
    const refresh = async () => {
        if (isRefreshing) return
        isRefreshing = true
        error.value = null
        try {
            // 1. Refresh Wallet (Assets/Tokens)
            await store.refreshBalances()
            // 2. Refresh Identity (Credits/Keys) - The Fix
            if (Identity.isConnected) {
                await Identity.fetchBalance()
            }
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
        }, 1000)
    }
    const loadMoreTransactions = async (limit = 20) => {
        await store.fetchRealTransactions(limit)
    }
    const startPolling = (intervalMs = 30000) => {
        if (pollInterval) {
            console.log('⏱️  Polling already active')
            return
        }
        console.log(`⏱️  Starting wallet polling every ${intervalMs}ms`)
        refresh()
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
    const handleTransactionSuccess = () => {
        console.log('💸 Transaction completed, refreshing wallet...')
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
    onMounted(() => {
        document.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('transaction:success', handleTransactionSuccess)
    })
    onUnmounted(() => {
        stopPolling()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('transaction:success', handleTransactionSuccess)
        if (refreshTimeout) clearTimeout(refreshTimeout)
    })
    return {
        user: computed(() => store.user),
        assets: computed(() => store.assets),
        transactions: computed(() => store.transactions),
        totalUsdValue: computed(() => store.totalUsdValue),
        isLoading: computed(() => store.isLoading || loading.value),
        balanceChange: computed(() => store.balanceChange),
        error: computed(() => error.value),
        isPolling: computed(() => !!pollInterval),
        platform,
        initialize,
        refresh,
        debouncedRefresh,
        loadMoreTransactions,
        startPolling,
        stopPolling,
        clear: store.clear,
        getTokenBalance,
        sendCredits,
        sendToken,
        sendCredit,
        sendTokenTransfer,
        withdrawDash,
        fetchLiveBalances: store.fetchLiveBalances,
        fetchRealTransactions: store.fetchRealTransactions,
        findAsset: (ticker: string) => store.getAssetByTicker(ticker),
        network: computed(() => network.value),
        getTransferKey: keys.getTransferKey,
        getAuthKey: keys.getAuthKey
    }
}
export type UseWalletReturn = ReturnType<typeof useWallet>
