// src/stores/wallet.ts

/* Import modules. */
import { defineStore } from 'pinia'
import { useSystemStore } from './system'
import { IUser2, IAsset, ITransaction, IBalanceChange } from '@/libs/types'

interface IWalletState {
    user: IUser2 | null;
    assets: IAsset[];
    transactions: ITransaction[];
    balanceChange: IBalanceChange | null;
    isLoading: boolean;
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
        /**
         * Populates the store with mock data for development.
         */
        initializeMockData() {
            const system = useSystemStore()
            const dashPrice = system.currentDashPrice

            this.user = {
                name: 'BetaTesterExtraordinaire',
                address: 'v24uWwdXJ1fJx7YccBmVB48zXPVT5uRYv7vKr5LS5B5',
            }

            this.assets = [
                { ticker: 'DASH', name: 'Dash Coins', amount: 50.00, usdValue: 50.00 * dashPrice },
                { ticker: 'CREDITS', name: 'Dash Credits', amount: 112.55, usdValue: 2750.00 },
                { ticker: 'SANS', name: 'Sansnote', amount: 1337.88, usdValue: 28.64 },
                { ticker: 'DUSD', name: 'Dash USD', amount: 1100.67, usdValue: 1100.67 },
            ]

            this.transactions = [
                {
                    id: 'tx1',
                    type: 'sent',
                    title: 'Sent DASH',
                    subtitle: 'To: EWSqsaghuw...AkJWRTpY',
                    amount: '-0.1 DASH',
                    status: 'Completed',
                    date: new Date('2024-01-15T10:30:00Z')
                },
                {
                    id: 'tx2',
                    type: 'received',
                    title: 'Received DUSD',
                    subtitle: 'From: 6Eb4tQdp24...cj1m87sj',
                    amount: '+500.00 DUSD',
                    status: 'Completed',
                    date: new Date('2024-01-14T14:45:00Z')
                },
                {
                    id: 'tx3',
                    type: 'swap',
                    title: 'Swap DASH to DUSD',
                    subtitle: 'DashSwap Router',
                    amount: '1.025 DASH',
                    status: 'Pending...',
                    date: new Date()
                },
            ]

            this.balanceChange = {
                isPositive: true,
                percent: 1.25,
                amount: 152.34,
            }
        },

        /**
         * Updates USD values based on current DASH price
         */
        updateAssetPrices() {
            const system = useSystemStore()
            const dashPrice = system.currentDashPrice

            this.assets = this.assets.map(asset => {
                if (asset.ticker === 'DASH') {
                    return {
                        ...asset,
                        usdValue: asset.amount * dashPrice
                    }
                }
                return asset
            })
        },

        async refreshBalances() {
            this.isLoading = true
            console.log('Refreshing balances...')

            // Update DASH price first
            const system = useSystemStore()
            await system.fetchDashPrice()

            // Update asset prices with new DASH price
            this.updateAssetPrices()

            // In a real app, you would fetch fresh data here
            await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate network delay
            this.isLoading = false
            console.log('Balances refreshed.')
        },
    },
})
