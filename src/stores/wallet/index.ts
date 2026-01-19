// src/stores/wallet/index.ts

import { defineStore } from 'pinia'
import type { IAsset, IUser, ITransaction } from '@/types'
import type { Network } from '@/composables/useNetwork'

export interface IWalletState {
  user: IUser | null
  assets: IAsset[]
  transactions: ITransaction[]
  balanceChange: number | null
  isLoading: boolean
  network: Network
}

export const useWalletStore = defineStore('wallet', {
    state: (): IWalletState => ({
        user: null,
        assets: [],
        transactions: [],
        balanceChange: null,
        isLoading: false,
        network: 'testnet',
    }),
    getters: {
        totalUsdValue: (state): number => {
            return state.assets.reduce((total, asset) => total + (asset.usdValue || 0), 0)
        },
        /**
         * Robust search for assets.
         * 1. Checks strict match.
         * 2. Fallback: Checks testnet prefix (e.g. input 'DUSD' finds 'tDUSD').
         */
        getAssetByTicker: (state) => {
            return (symbol: string): IAsset | undefined => {
                // 1. Strict search
                let asset = state.assets.find((asset: IAsset) => asset.symbol === symbol)

                // 2. Variant search (Testnet prefix)
                if (!asset) {
                    // Map common tickers to potential testnet variants
                    const variant = `t${symbol}`
                    asset = state.assets.find((asset: IAsset) => asset.symbol === variant)
                }

                return asset
            }
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
        async refreshBalances(network?: Network) {
            const { refreshBalances } = await import('./actions/index')
            await refreshBalances.call(this, network)
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
