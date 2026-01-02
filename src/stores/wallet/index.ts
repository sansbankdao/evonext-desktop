// src/stores/wallet/index.ts

import { defineStore } from 'pinia'
import type { IAsset, IUser, ITransaction } from '@/types'

export interface IWalletState {
  user: IUser | null
  assets: IAsset[]
  transactions: ITransaction[]
  balanceChange: number | null
  isLoading: boolean
}

export const useWalletStore = defineStore('wallet', {
    state: (): IWalletState => ({
        user: null,
        assets: [],
        transactions: [],
        balanceChange: null,
        isLoading: false,
    }),
    getters: {
        totalUsdValue: (state): number => {
            return state.assets.reduce((total, asset) => total + (asset.usdValue || 0), 0)
        },
        getAssetByTicker: (state) => {
            return (symbol: string): IAsset | undefined => state.assets.find(asset => asset.symbol === symbol)
        },
    },
    actions: {
        async fetchLiveBalances() {
            const { fetchLiveBalances } = await import('./actions/index')
            await fetchLiveBalances.call(this)
        },
        async fetchRealTransactions(limit: number = 20) {
            const { fetchRealTransactions } = await import('./actions/index')
            await fetchRealTransactions.call(this, limit)
        },
        async refreshBalances() {
            const { refreshBalances } = await import('./actions/index')
            await refreshBalances.call(this)
        },
        // FIXED: Delegates to actions/api to break circular dependency
        async getTokenBalance(identityId: string, contractId: string): Promise<bigint> {
            const { fetchTokenBalance } = await import('./actions/api')
            return await fetchTokenBalance(identityId, contractId)
        },
        async init(user: IUser) {
            this.user = user
            await this.refreshBalances()
        },
        clear() {
            this.user = null
            this.assets = []
            this.transactions = []
            this.balanceChange = null
            this.isLoading = false
        },
        // Helper util often required by composables using the wallet store
        fromSatoshi(amount: number | bigint): number {
            const val = typeof amount === 'bigint' ? Number(amount) : amount
            return val / 100000000
        }
    },
})
