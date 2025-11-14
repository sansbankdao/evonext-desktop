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

        async wasmTest() {
            /* Initialize WASM module. */
            await init()

            /* Pre-fretch trusted quorums. */
            await prefetch_trusted_quorums_mainnet()

            /* Initialize SDK. */
            const sdk = await WasmSdkBuilder
                .new_mainnet_trusted()
                .build()

            const username = 'shomari'

            /* Resolve username. */
            const identityid = await dpns_resolve_name(sdk, username)
                .catch(err => {
                    console.error(err)
                    console.error('NAME NOT FOUND!!')
                })
console.log('GET IDENTITY (response)', identityid)
        }

    },
})
