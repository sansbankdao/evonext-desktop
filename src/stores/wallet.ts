// src/stores/wallet.ts

/* Import modules. */
import { defineStore } from 'pinia'
import { getIdentityBalance } from '@evonext/platform'

import { useSystemStore } from './system'
// import { useSettingsStore } from './settings'

import {
    DUSD_CONTRACT_ID,
    TDUSD_CONTRACT_ID,
    SANS_CONTRACT_ID,
    TSANS_CONTRACT_ID,
    DUSD_DECIMAL_PLACES,
    SANS_DECIMAL_PLACES,
} from '@/constants'
import type { IAsset, ITransaction, IWalletState } from '@/types'

import getNetwork from '@/libs/getNetwork'
import getTokenBalances from '@/libs/getTokenBalances'

/* Import constants. */
import {
    PLATFORM_HTTP_API_MAINNET,
    PLATFORM_HTTP_API_TESTNET,
} from '@/constants'

interface IdentityTransfer {
    amount: number
    sender: string | null
    recipient: string
    timestamp: string
    txHash: string
    type: string
    blockHash: string
    gasUsed: number
}

interface TokenTransition {
    amount: number
    recipient: string
    owner: {
        identifier: string
        aliases: Array<{
            alias: string
            contested: boolean
            documentId: string
            status: string
            timestamp: string
        }>
    }
    action: string
    stateTransitionHash: string
    timestamp: string
    publicNote: string | null
}

interface ApiResponse<T> {
    resultSet: T[]
    pagination: {
        page: number
        limit: number
        total: number
    }
}

/**
 * Fetches identity credit transfers for a given identity
 */
const fetchIdentityTransfers = async (
    identityId: string,
    limit: number = 10,
): Promise<IdentityTransfer[]> => {
    try {
        /* Request network. */
        const network = await getNetwork()

        /* Set API endpoint. */
        const apiEndpoint = network === 'mainnet'
            ? PLATFORM_HTTP_API_MAINNET : PLATFORM_HTTP_API_TESTNET

        /* Request (remote) data. */
        const response = await fetch(
            `${apiEndpoint}/identity/${identityId}/transfers?page=1&limit=${limit}&order=desc`
        )

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json() as ApiResponse<IdentityTransfer>
        return data.resultSet
    } catch (error) {
        console.error('Failed to fetch identity transfers:', error)
        return []
    }
}

/**
 * Fetches token transitions for a given token contract
 */
const fetchTokenTransitions = async (
    contractId: string,
    limit: number = 10,
): Promise<TokenTransition[]> => {
    try {
        /* Request network. */
        const network = await getNetwork()

        /* Set API endpoint. */
        const apiEndpoint = network === 'mainnet'
            ? PLATFORM_HTTP_API_MAINNET : PLATFORM_HTTP_API_TESTNET

        /* Request (remote) data. */
        const response = await fetch(
            `${apiEndpoint}/token/${contractId}/transitions?page=1&limit=${limit}&order=desc`
        )

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json() as ApiResponse<TokenTransition>
        return data.resultSet
    } catch (error) {
        console.error('Failed to fetch token transitions:', error)
        return []
    }
}

/**
 * Converts atomic/satoshi amount to DASH for display
 */
const atomicToDash = (atomicAmount: number): number => {
    const duffs = atomicAmount / 1000 // 1000 credits = 1 duff
    return duffs / 100000000 // 100,000,000 duffs = 1 DASH
}

/**
 * Formats a DASH amount with sign and ticker
 */
const formatDashAmount = (amount: number, isPositive: boolean): string => {
    const sign = isPositive ? '+' : '-'
    return `${sign}${Math.abs(amount).toFixed(6)} DASH`
}

/**
 * Formats a token amount with sign and ticker
 */
const formatTokenAmount = (atomicAmount: number, ticker: string, decimals: number, isPositive: boolean): string => {
    const amount = atomicAmount / (10 ** decimals)
    const sign = isPositive ? '+' : '-'
    return `${sign}${Math.abs(amount).toFixed(6)} ${ticker}`
}

/**
 * Truncates a hash/address for display
 */
const truncateAddress = (address: string): string => {
    if (!address) return 'Unknown'
    if (address.length <= 16) return address
    return `${address.slice(0, 8)}...${address.slice(-8)}`
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
         * Updates USD values based on current DASH price and hardcoded token prices
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
                } else if (asset.ticker === 'CREDITS') {
                    // Use DASH price for credits (same balance, same USD value)
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
            const network = await getNetwork()
            const system = useSystemStore()

            try {
                console.log('Fetching live balances for:', identityId, 'on', network)

                // Fetch CREDITS balance using @evonext/platform (DASH shows same)
                const creditsBalanceSatoshis = await getIdentityBalance(network, identityId)
                    .catch(err => console.error(err))

                const creditsBalance = creditsBalanceSatoshis
                    ? Number(creditsBalanceSatoshis) / 100_000_000_000 // 12 decimals
                    : 0
                const dashBalance = creditsBalance // DASH and CREDITS show same balance

                console.log(`Credits/DASH balance: ${creditsBalance}`)

                /* Initialize locals. */
                let activeTokens

                /* Handle network. */
                if (network === 'mainnet') {
                    /* Set active (mainnet) tokens. */
                    activeTokens = [DUSD_CONTRACT_ID, SANS_CONTRACT_ID]
                } else {
                    /* Set active (testnet) tokens. */
                    activeTokens = [TDUSD_CONTRACT_ID, TSANS_CONTRACT_ID]
                }

                // Fetch token balances
                const tokenBalances = await getTokenBalances(identityId, activeTokens)
                console.log('Token balances:', tokenBalances)

                // Process token balances
                const dusdBalanceAtomic = tokenBalances.find(token => {
                    const tokenIdStr = token.tokenId.base58()
                    return network === 'testnet'
                        ? tokenIdStr === TDUSD_CONTRACT_ID
                        : tokenIdStr === DUSD_CONTRACT_ID
                })?.balance || BigInt(0)

                const sansBalanceAtomic = tokenBalances.find(token => {
                    const tokenIdStr = token.tokenId.base58()
                    return network === 'testnet'
                        ? tokenIdStr === TSANS_CONTRACT_ID
                        : tokenIdStr === SANS_CONTRACT_ID
                })?.balance || BigInt(0)

                const dusdBalance = Number(dusdBalanceAtomic) / (10 ** DUSD_DECIMAL_PLACES) // 6 decimals
                const sansBalance = Number(sansBalanceAtomic) / (10 ** SANS_DECIMAL_PLACES) // 8 decimals

                console.log(`DUSD balance: ${dusdBalance}, SANS balance: ${sansBalance}`)

                // Update assets array with live data and proper USD values
                const updatedAssets: IAsset[] = [
                    // DASH (same as credits)
                    {
                        ticker: 'DASH',
                        name: 'Dash Coins',
                        amount: dashBalance,
                        usdValue: dashBalance * system.currentDashPrice
                    },
                    // CREDITS (same as DASH balance, uses DASH price)
                    {
                        ticker: 'CREDITS',
                        name: 'Dash Credits',
                        amount: creditsBalance,
                        usdValue: creditsBalance * system.currentDashPrice
                    },
                    // DUSD ($1.00 hardcoded)
                    {
                        ticker: 'DUSD',
                        name: 'Dash USD',
                        amount: dusdBalance,
                        usdValue: dusdBalance * 1.00 // $1.00 per DUSD
                    },
                    // SANS ($0.08 hardcoded)
                    {
                        ticker: 'SANS',
                        name: 'Sansnote',
                        amount: sansBalance,
                        usdValue: sansBalance * 0.08 // $0.08 per SANS
                    },
                ]

                this.assets = updatedAssets.filter(asset => asset.amount > 0 || asset.ticker === 'DASH') // Keep DASH even if zero
                this.updateAssetPrices()

            } catch (error) {
                console.error('Failed to fetch live balances:', error)
                // Keep existing assets (including mock DASH)
            }
        },

        /**
         * Fetches real transactions from the Dash Platform explorer API
         */
        async fetchRealTransactions() {
            if (!this.user?.address) {
                console.warn('No user identity available for transaction fetch')
                return
            }

            const identityId = this.user.address
            const network = await getNetwork()

            // Only support mainnet for now
            // if (network !== 'mainnet') {
            //     console.log('Transaction fetching only available on Mainnet')
            //     this.transactions = []
            //     return
            // }

            this.isLoading = true
            console.log('Fetching real transactions for:', identityId)

            try {
                // Fetch identity transfers and token transitions concurrently
                const [identityTransfers, dusdTransitions, sansTransitions] = await Promise.all([
                    fetchIdentityTransfers(identityId),
                    fetchTokenTransitions(DUSD_CONTRACT_ID),
                    fetchTokenTransitions(SANS_CONTRACT_ID)
                ])

                // Transform identity transfers into transaction objects
                const identityTransactions: ITransaction[] = identityTransfers.map(transfer => {
                    const isSent = transfer.sender === identityId
                    const isReceived = transfer.recipient === identityId

                    let type: 'sent' | 'received'
                    let title: string
                    let subtitle: string
                    let amountStr: string

                    if (transfer.type === 'IDENTITY_CREATE') {
                        type = 'received'
                        title = 'New Identity Registered'
                        subtitle = 'Identity Creation'
                        const dashAmount = atomicToDash(transfer.amount)
                        amountStr = formatDashAmount(dashAmount, true)
                    } else if (transfer.type === 'IDENTITY_CREDIT_TRANSFER') {
                        if (isSent) {
                            type = 'sent'
                            title = 'Sent DASH'
                            subtitle = `To: ${truncateAddress(transfer.recipient)}`
                            const dashAmount = atomicToDash(transfer.amount)
                            amountStr = formatDashAmount(dashAmount, false)
                        } else if (isReceived) {
                            type = 'received'
                            title = 'Received DASH'
                            subtitle = `From: ${truncateAddress(transfer.sender || 'Unknown')}`
                            const dashAmount = atomicToDash(transfer.amount)
                            amountStr = formatDashAmount(dashAmount, true)
                        } else {
                            type = 'received'
                            title = 'Credit Transfer'
                            subtitle = 'Unknown'
                            const dashAmount = atomicToDash(transfer.amount)
                            amountStr = formatDashAmount(dashAmount, true)
                        }
                    } else {
                        type = 'received'
                        title = transfer.type
                        subtitle = 'Unknown'
                        const dashAmount = atomicToDash(transfer.amount)
                        amountStr = formatDashAmount(dashAmount, true)
                    }

                    return {
                        id: transfer.txHash,
                        type,
                        title,
                        subtitle,
                        amount: amountStr,
                        status: 'Completed' as const,
                        date: new Date(transfer.timestamp)
                    }
                })

                /* Transform DUSD transitions. */
                const dusdTransactions: ITransaction[] = []

                /* Handle DUSD transitions. */
                for (const transition of dusdTransitions) {
                    if (transition.owner.identifier !== identityId && transition.recipient !== identityId) {
                        continue
                    }

                    const isSent = transition.owner.identifier === identityId
                    const isReceived = transition.recipient === identityId

                    let type: 'sent' | 'received' = 'received'
                    let title = ''
                    let subtitle = ''
                    let amountStr = ''

                    switch (transition.action) {
                        case 'TOKEN_MINT':
                            type = 'received'
                            title = 'Minted DUSD'
                            subtitle = 'Token Mint'
                            amountStr = formatTokenAmount(transition.amount, 'DUSD', DUSD_DECIMAL_PLACES, true)
                            break

                        case 'TOKEN_TRANSFER':
                            if (isSent) {
                                type = 'sent'
                                title = 'Sent DUSD'
                                subtitle = `To: ${truncateAddress(transition.recipient)}`
                                amountStr = formatTokenAmount(transition.amount, 'DUSD', DUSD_DECIMAL_PLACES, false)
                            } else if (isReceived) {
                                type = 'received'
                                title = 'Received DUSD'
                                subtitle = `From: ${truncateAddress(transition.owner.identifier)}`
                                amountStr = formatTokenAmount(transition.amount, 'DUSD', DUSD_DECIMAL_PLACES, true)
                            }
                            break

                        default:
                            continue
                    }

                    dusdTransactions.push({
                        id: transition.stateTransitionHash,
                        type,
                        title,
                        subtitle,
                        amount: amountStr,
                        status: 'Completed' as const,
                        date: new Date(transition.timestamp)
                    })
                }

                /* Transform SANS transitions. */
                const sansTransactions: ITransaction[] = []

                /* Handle SANS transitions. */
                for (const transition of sansTransitions) {
                    if (transition.owner.identifier !== identityId && transition.recipient !== identityId) {
                        continue
                    }

                    const isSent = transition.owner.identifier === identityId
                    const isReceived = transition.recipient === identityId

                    let type: 'sent' | 'received' = 'received'
                    let title = ''
                    let subtitle = ''
                    let amountStr = ''

                    switch (transition.action) {
                        case 'TOKEN_MINT':
                            type = 'received'
                            title = 'Minted SANS'
                            subtitle = 'Token Mint'
                            amountStr = formatTokenAmount(transition.amount, 'SANS', SANS_DECIMAL_PLACES, true)
                            break

                        case 'TOKEN_TRANSFER':
                            if (isSent) {
                                type = 'sent'
                                title = 'Sent SANS'
                                subtitle = `To: ${truncateAddress(transition.recipient)}`
                                amountStr = formatTokenAmount(transition.amount, 'SANS', SANS_DECIMAL_PLACES, false)
                            } else if (isReceived) {
                                type = 'received'
                                title = 'Received SANS'
                                subtitle = `From: ${truncateAddress(transition.owner.identifier)}`
                                amountStr = formatTokenAmount(transition.amount, 'SANS', SANS_DECIMAL_PLACES, true)
                            }
                            break

                        default:
                            continue
                    }

                    sansTransactions.push({
                        id: transition.stateTransitionHash,
                        type,
                        title,
                        subtitle,
                        amount: amountStr,
                        status: 'Completed' as const,
                        date: new Date(transition.timestamp)
                    })
                }

                // Combine all transactions and sort by date (most recent first)
                this.transactions = [
                    ...identityTransactions,
                    ...dusdTransactions,
                    ...sansTransactions
                ].sort((a, b) => b.date.getTime() - a.date.getTime())

                console.log(`Loaded ${this.transactions.length} real transactions`)
            } catch (error) {
                console.error('Failed to fetch real transactions:', error)
                this.transactions = []
            } finally {
                this.isLoading = false
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

            // Fetch real transactions
            await this.fetchRealTransactions()

            // Update asset prices with new DASH price
            this.updateAssetPrices()

            this.isLoading = false
            console.log('Balances and transactions refreshed.')
        },
    },
})
