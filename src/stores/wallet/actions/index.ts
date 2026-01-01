// src/stores/wallet/actions/index.ts

import { defineStore } from 'pinia'
import { useSystemStore } from '../system'
import type { IAsset, IWalletState } from '@/types'
import {
    fetchLiveBalances,
    fetchRealTransactions,
    refreshBalances
} from './actions/index'

export const useWalletStore = defineStore('wallet', {
    state: (): IWalletState => ({
        user: null,
        assets: [],
        transactions: [],
        balanceChange: null,
        isLoading: false,
    }),
    getters: {
        /**
         * Calculates the total USD value of all assets in the wallet.
         * Now that all assets have usdValue calculated in createUpdatedAssets,
         * we can simply sum them up.
         */
        totalUsdValue: (state): number => {
            return state.assets.reduce((total, asset) => total + asset.usdValue, 0)
        },
        /**
         * Finds an asset by its ticker symbol.
         */
        getAssetByTicker: (state) => {
            return (ticker: string): IAsset | undefined => state.assets.find(asset => asset.ticker === ticker)
        },
    },
    actions: {
        async fetchLiveBalances() {
            await fetchLiveBalances.call(this)
        },
        async fetchRealTransactions(limit: number = 20) {
            await fetchRealTransactions.call(this, limit)
        },
        async refreshBalances() {
            await refreshBalances.call(this)
        },
        /**
         * Initialize wallet with a user
         */
        async init(user: { address: string }) {
            this.user = user
            await this.refreshBalances()
        },
        /**
         * Clear wallet state
         */
        clear() {
            this.user = null
            this.assets = []
            this.transactions = []
            this.balanceChange = null
            this.isLoading = false
        }
    },
})
