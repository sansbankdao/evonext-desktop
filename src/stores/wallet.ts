// src/stores/wallet.ts

/* Import modules. */
import { defineStore } from 'pinia'
import { getIdentityBalance } from '@evonext/platform'

import { useSystemStore } from './system'
import { useSettingsStore } from './settings'

import { IUser2, IAsset, ITransaction, IBalanceChange } from '@/libs/types'
import getTokenBalances from '@/libs/getTokenBalances'
import {
    DUSD_CONTRACT_ID,
    TDUSD_CONTRACT_ID,
    SANS_CONTRACT_ID,
    TSANS_CONTRACT_ID,
    DUSD_DECIMAL_PLACES,
    SANS_DECIMAL_PLACES,
} from '@/libs/constants'

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

            // Only DASH has mock balance, others will be loaded live
            this.assets = [
                { ticker: 'DASH', name: 'Dash Coins', amount: 50.00, usdValue: 50.00 * dashPrice },
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

        /**
         * Fetches live balances for CREDITS, DUSD, and SANS
         */
        async fetchLiveBalances() {
            if (!this.user?.address) {
                console.warn('No user identity available for balance fetch')
                return
            }

            const identityId = this.user.address
            const Settings = useSettingsStore()
            const isTestnet = Settings.network === 'testnet'
            const system = useSystemStore()

            try {
                console.log('Fetching live balances for:', identityId)

                // Fetch CREDITS balance (same as DASH)
                const creditsBalanceSatoshis = await getIdentityBalance(isTestnet ? 'testnet' : 'mainnet', identityId)
                const creditsBalance = creditsBalanceSatoshis
                    ? Number(creditsBalanceSatoshis) / 100_000_000_000 // 12 decimals
                    : 0
                const dashBalance = creditsBalance // DASH and CREDITS show same balance

                console.log(`Credits/DASH balance: ${creditsBalance}`)

                // Fetch token balances
                const tokenBalances = await getTokenBalances(identityId, [])
                console.log('Token balances:', tokenBalances)

                // Process token balances
                const dusdBalanceAtomic = tokenBalances.find(token => {
                    const tokenIdStr = token.tokenId.base58()
                    return isTestnet
                        ? tokenIdStr === TDUSD_CONTRACT_ID
                        : tokenIdStr === DUSD_CONTRACT_ID
                })?.balance || BigInt(0)

                const sansBalanceAtomic = tokenBalances.find(token => {
                    const tokenIdStr = token.tokenId.base58()
                    return isTestnet
                        ? tokenIdStr === TSANS_CONTRACT_ID
                        : tokenIdStr === SANS_CONTRACT_ID
                })?.balance || BigInt(0)

                const dusdBalance = Number(dusdBalanceAtomic) / (10 ** DUSD_DECIMAL_PLACES) // 6 decimals
                const sansBalance = Number(sansBalanceAtomic) / (10 ** SANS_DECIMAL_PLACES) // 8 decimals

                console.log(`DUSD balance: ${dusdBalance}, SANS balance: ${sansBalance}`)

                // Update assets array
                const updatedAssets: IAsset[] = [
                    // DASH (same as credits)
                    {
                        ticker: 'DASH',
                        name: 'Dash Coins',
                        amount: dashBalance,
                        usdValue: dashBalance * system.currentDashPrice
                    },
                    // CREDITS (same as DASH)
                    {
                        ticker: 'CREDITS',
                        name: 'Dash Credits',
                        amount: creditsBalance,
                        usdValue: creditsBalance * 24.45 // ~$0.00000002445 per credit
                    },
                    // DUSD
                    {
                        ticker: 'DUSD',
                        name: 'Dash USD',
                        amount: dusdBalance,
                        usdValue: dusdBalance
                    },
                    // SANS
                    {
                        ticker: 'SANS',
                        name: 'Sansnote',
                        amount: sansBalance,
                        usdValue: sansBalance * 0.0000214 // ~$0.0000214 per SANS
                    },
                ]

                this.assets = updatedAssets.filter(asset => asset.amount > 0) // Only show assets with balance
                this.updateAssetPrices() // Update USD values with latest DASH price

            } catch (error) {
                console.error('Failed to fetch live balances:', error)
                // Keep existing assets (including mock DASH if present)
            }
        },

        async refreshBalances() {
            this.isLoading = true
            console.log('Refreshing balances...')

            // Update DASH price first
            const system = useSystemStore()
            await system.fetchDashPrice()

            // Fetch live balances (CREDITS, DUSD, SANS)
            await this.fetchLiveBalances()

            // Update asset prices with new DASH price
            this.updateAssetPrices()

            this.isLoading = false
            console.log('Balances refreshed.')
        },
    },
})
