// src/stores/wallet.ts
import { defineStore } from 'pinia'

import init, {
    WasmSdkBuilder,
    // identity_fetch,
    dpns_resolve_name,
    // get_dpns_usernames,
    // get_documents,
    // get_identity_token_balances,
    prefetch_trusted_quorums_mainnet,
} from '@/libs/dash/wasm_sdk.js'

// In a real app, you would import these from a shared types file
// e.g., import { User, Asset, Transaction, BalanceChange } from '@/types'

// ### Data Structures ###

interface User {
    name: string
    address: string
}

interface Asset {
    ticker: string
    name: string
    amount: number
    usdValue: number
}

interface Transaction {
    id: string
    type: 'sent' | 'received' | 'swap'
    title: string
    subtitle: string
    amount: string // Formatted amount with +/- and ticker
    status: 'Completed' | 'Pending...' | 'Failed'
}

interface BalanceChange {
    isPositive: boolean
    percent: number
    amount: number
}

interface WalletState {
    user: User | null
    assets: Asset[]
    transactions: Transaction[]
    balanceChange: BalanceChange | null
    isLoading: boolean
}

export const useWalletStore = defineStore('wallet', {
    state: (): WalletState => ({
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
            return state.assets.reduce((total, asset) => total + asset.usdValue, 0)
        },
        /**
         * Finds an asset by its ticker symbol.
         */
        getAssetByTicker: (state) => {
            return (ticker: string): Asset | undefined => state.assets.find(asset => asset.ticker === ticker)
        },
    },

    actions: {
        /**
         * Populates the store with mock data for development.
         */
        initializeMockData() {
            this.user = {
                name: 'BetaTesterExtraordinaire',
                address: 'v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5',
            }

            this.assets = [
                { ticker: 'DASH', name: 'Dash Credits', amount: 112.55, usdValue: 2750.00 },
                { ticker: 'SANS', name: 'Sansnote', amount: 1337.88, usdValue: 28.64 },
                { ticker: 'DUSD', name: 'Dash USD', amount: 1100.67, usdValue: 1100.67 },
            ]

            this.transactions = [
                { id: 'tx1', type: 'sent', title: 'Sent DASH', subtitle: 'To: EWSqsaghuw...AkJWRTpY', amount: '-0.1 DASH', status: 'Completed' },
                { id: 'tx2', type: 'received', title: 'Received DUSD', subtitle: 'From: 6Eb4tQdp24...cj1m87sj', amount: '+500.00 DUSD', status: 'Completed' },
                { id: 'tx3', type: 'swap', title: 'Swap DASH to DUSD', subtitle: 'DashSwap Router', amount: '1.025 DASH', status: 'Pending...' },
            ]

            this.balanceChange = {
                isPositive: true,
                percent: 1.25,
                amount: 152.34,
            }
        },

        async refreshBalances() {
            this.isLoading = true
            console.log('Refreshing balances...')
            // In a real app, you would fetch fresh data here
            await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
            this.isLoading = false
            console.log('Balances refreshed.')
        },
    },
})
