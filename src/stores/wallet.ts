// src/stores/wallet.ts
import { defineStore } from 'pinia';

// Define the structure of a single asset
interface Asset {
    id: string;
    name: string;
    ticker: string;
    icon: string;
    balance: number;
    usdValue: number;
}

// Define the state for the wallet store
interface WalletState {
    assets: Asset[];
    isLoading: boolean;
}

export const useWalletStore = defineStore('wallet', {
    state: (): WalletState => ({
        assets: [
            {
                id: 'dash',
                name: 'Dash Credits',
                ticker: 'DASH',
                icon: '/icons/dash.svg',
                balance: 112.55,
                usdValue: 2750.00,
            },
            {
                id: 'sans',
                name: 'Sansnote',
                ticker: 'SANS',
                icon: '/icons/sans.svg',
                balance: 1337.88,
                usdValue: 28.64,
            },
            {
                id: 'dusd',
                name: 'Dash USD',
                ticker: 'DUSD',
                icon: '/icons/dusd.svg',
                balance: 1100.67,
                usdValue: 1100.67,
            },
        ],
        isLoading: false,
    }),

    getters: {
        // totalUsdValue: (state) => {
        totalUsdValue: () => {
            return '$1,337.88'
            // return state.assets.reduce((total, asset) => total + asset.usdValue, 0)
        },
        getAssetByTicker: (state) => {
            return (ticker: string) => state.assets.find(asset => asset.ticker === ticker)
        },
    },

    actions: {
        async refreshBalances() {
            this.isLoading = true
            // In a real app, you would call your backend here to get fresh data
            // For example: const freshAssets = await invoke('get_wallet_balances');
            // this.assets = freshAssets;
            console.log('Refreshing balances...')

            setTimeout(() => { // Simulating a network delay
                this.isLoading = false
                console.log('Balances refreshed.')
            }, 1000)
        },
    },
})
