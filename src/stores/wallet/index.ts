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
        getAssetByTicker: (state) => {
            return (symbol: string): IAsset | undefined => {
                let asset = state.assets.find((asset: IAsset) => asset.symbol === symbol)
                if (!asset) {
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
        async getTokenBalance(identityId: string, contractId: string): Promise<bigint> {
            const { fetchTokenBalance } = await import('./actions/api')
            const response = await fetchTokenBalance(identityId, contractId)
            // FIX: Unwrap response and cast to BigInt
            const rawValue = (response as any)?.data ?? response
            return BigInt(String(rawValue || 0))
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
        fromSatoshi(amount: number | bigint): number {
            const val = typeof amount === 'bigint' ? Number(amount) : amount
            return val / 100000000
        }
    },
})
