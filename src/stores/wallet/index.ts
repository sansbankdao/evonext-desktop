// src/stores/wallet/index.ts

import { defineStore } from 'pinia'
import { useSystemStore } from '../system'
import type { IAsset, ITransaction, IWalletState } from '@/types'
import {
    fetchLiveBalances,
    fetchRealTransactions,
    refreshBalances
} from './actions'
import { updateAssetPrices } from './actions/transforms'

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
         */
        totalUsdValue: (state): number => {
            const system = useSystemStore()
            const dashPrice = system.currentDashPrice
            return state.assets.reduce((total, asset) => {
                if (asset.ticker === 'DASH') {
                    return total + (asset.amount * dashPrice)
                }
                return total + asset.usdValue
            }, 0)
        },
        /**
         * Finds an asset by its ticker symbol.
         */
        getAssetByTicker: (state) => {
            return (ticker: string): IAsset | undefined => state.assets.find(asset => asset.ticker === ticker)
        },
    },
    actions: {
        updateAssetPrices() {
            updateAssetPrices.call(this)
        },
        async fetchLiveBalances() {
            await fetchLiveBalances.call(this)
        },
        async fetchRealTransactions() {
            await fetchRealTransactions.call(this)
        },
        async refreshBalances() {
            await refreshBalances.call(this)
        },
    },
})
