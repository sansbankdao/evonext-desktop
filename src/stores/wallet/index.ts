// src/stores/wallet/index.ts

import { defineStore } from 'pinia'
import type { IAsset, IWalletState, IUser } from '@/types'

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
            return state.assets.reduce((total, asset) => total + asset.usdValue, 0)
        },
        getAssetByTicker: (state) => {
            return (ticker: string): IAsset | undefined => state.assets.find(asset => asset.ticker === ticker)
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
        }
    },
})
