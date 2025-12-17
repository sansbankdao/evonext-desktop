// src/stores/wallet/actions.ts
/* Import modules. */
import { getIdentityBalance } from '@evonext/platform'
import { useSystemStore } from '../system'
import {
    getAllActiveTokens,
    getDUSDContractId,
    getSANSContractId,
    DUSD_DECIMAL_PLACES,
    SANS_DECIMAL_PLACES
} from '@/constants'
import { ErrorBoundary } from '@/utils/errors'
import { log, isTestnet } from '@/utils/env'
import getNetwork from '@/libs/getNetwork'
import getTokenBalances from '@/libs/getTokenBalances'
import { truncateAddress, formatDashAmount, formatTokenAmount, atomicToDash } from './utils'
import { fetchIdentityTransfers, fetchTokenTransitions } from './api'
import type { ITransaction, IAsset } from '@/types'
import type { TokenTransition, IdentityTransfer } from './types'

/**
 * Updates USD values based on current DASH price and hardcoded token prices
 */
export function updateAssetPrices(this: any) {
    const system = useSystemStore()
    const dashPrice = system.currentDashPrice

    this.assets = this.assets.map((asset: IAsset) => {
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
}

/**
 * Fetches live balances for CREDITS, DUSD, and SANS
 */
export async function fetchLiveBalances(this: any) {
    return ErrorBoundary.wrap(async () => {
        if (!this.user?.address) {
            log('warn', 'No user identity available for balance fetch')
            return
        }

        const identityId = this.user.address
        const network = await getNetwork()
        const system = useSystemStore()

        log('info', 'Fetching live balances for:', identityId, 'on', network)

        // Fetch CREDITS balance using @evonext/platform (DASH shows same)
        const creditsBalanceSatoshis = await getIdentityBalance(network as any, identityId)
            .catch(err => {
                log('error', 'Failed to fetch identity balance:', err)
                return null
            })

        const creditsBalance = creditsBalanceSatoshis
            ? Number(creditsBalanceSatoshis) / 100_000_000_000 // 12 decimals
            : 0
        const dashBalance = creditsBalance // DASH and CREDITS show same balance

        log('info', `Credits/DASH balance: ${creditsBalance}`)

        // Get active tokens based on network
        const activeTokens = getAllActiveTokens()

        // Fetch token balances
        const tokenBalances = await getTokenBalances(identityId, activeTokens)
        log('info', 'Token balances:', tokenBalances)

        // Process token balances
        const dusdBalanceAtomic = tokenBalances.find(token => {
            const tokenIdStr = token.tokenId?.base58?.() || token.tokenId
            const expectedId = isTestnet()
                ? getDUSDContractId()
                : getDUSDContractId()
            return tokenIdStr === expectedId
        })?.balance || BigInt(0)

        const sansBalanceAtomic = tokenBalances.find(token => {
            const tokenIdStr = token.tokenId?.base58?.() || token.tokenId
            const expectedId = isTestnet()
                ? getSANSContractId()
                : getSANSContractId()
            return tokenIdStr === expectedId
        })?.balance || BigInt(0)

        const dusdBalance = Number(dusdBalanceAtomic) / (10 ** DUSD_DECIMAL_PLACES) // 6 decimals
        const sansBalance = Number(sansBalanceAtomic) / (10 ** SANS_DECIMAL_PLACES) // 8 decimals

        log('info', `DUSD balance: ${dusdBalance}, SANS balance: ${sansBalance}`)

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
        updateAssetPrices.call(this)

    }, 'FETCH_LIVE_BALANCES_FAILED')
}

/**
 * Fetches real transactions from the Dash Platform explorer API
 */
export async function fetchRealTransactions(this: any) {
    return ErrorBoundary.wrap(async () => {
        if (!this.user?.address) {
            log('warn', 'No user identity available for transaction fetch')
            return
        }

        const identityId = this.user.address
        this.isLoading = true
        log('info', 'Fetching real transactions for:', identityId)

        try {
            // Fetch identity transfers and token transitions concurrently
            const [identityTransfers, dusdTransitions, sansTransitions] = await Promise.all([
                fetchIdentityTransfers(identityId),
                fetchTokenTransitions(getDUSDContractId()),
                fetchTokenTransitions(getSANSContractId())
            ])

            // Transform identity transfers into transaction objects
            const identityTransactions: ITransaction[] = identityTransfers.map(transfer =>
                transformIdentityTransfer(transfer, identityId)
            )

            // Transform token transitions
            const dusdTransactions: ITransaction[] = transformTokenTransitions(
                dusdTransitions,
                identityId,
                'DUSD',
                DUSD_DECIMAL_PLACES
            )

            const sansTransactions: ITransaction[] = transformTokenTransitions(
                sansTransitions,
                identityId,
                'SANS',
                SANS_DECIMAL_PLACES
            )

            // Combine all transactions and sort by date (most recent first)
            this.transactions = [
                ...identityTransactions,
                ...dusdTransactions,
                ...sansTransactions
            ].sort((a, b) => b.date.getTime() - a.date.getTime())

            log('info', `Loaded ${this.transactions.length} real transactions`)
        } catch (error) {
            log('error', 'Failed to fetch real transactions:', error)
            this.transactions = []
            throw error
        } finally {
            this.isLoading = false
        }
    }, 'FETCH_REAL_TRANSACTIONS_FAILED')
}

/**
 * Transform identity transfer to transaction object
 */
function transformIdentityTransfer(transfer: IdentityTransfer, identityId: string): ITransaction {
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
}

/**
 * Transform token transitions to transaction objects
 */
function transformTokenTransitions(
    transitions: TokenTransition[],
    identityId: string,
    tokenTicker: string,
    decimalPlaces: number
): ITransaction[] {
    const result: ITransaction[] = []

    for (const transition of transitions) {
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
                title = `Minted ${tokenTicker}`
                subtitle = 'Token Mint'
                amountStr = formatTokenAmount(transition.amount, tokenTicker, decimalPlaces, true)
                break

            case 'TOKEN_TRANSFER':
                if (isSent) {
                    type = 'sent'
                    title = `Sent ${tokenTicker}`
                    subtitle = `To: ${truncateAddress(transition.recipient)}`
                    amountStr = formatTokenAmount(transition.amount, tokenTicker, decimalPlaces, false)
                } else if (isReceived) {
                    type = 'received'
                    title = `Received ${tokenTicker}`
                    subtitle = `From: ${truncateAddress(transition.owner.identifier)}`
                    amountStr = formatTokenAmount(transition.amount, tokenTicker, decimalPlaces, true)
                }
                break

            default:
                continue
        }

        result.push({
            id: transition.stateTransitionHash,
            type,
            title,
            subtitle,
            amount: amountStr,
            status: 'Completed' as const,
            date: new Date(transition.timestamp)
        })
    }

    return result
}

/**
 * Refresh all balances and transactions
 */
export async function refreshBalances(this: any) {
    return ErrorBoundary.wrap(async () => {
        this.isLoading = true
        log('info', 'Refreshing balances...')

        // Update DASH price first
        const system = useSystemStore()
        await system.fetchDashPrice()

        // Fetch live balances (CREDITS, DUSD, SANS)
        await fetchLiveBalances.call(this)

        // Fetch real transactions
        await fetchRealTransactions.call(this)

        // Update asset prices with new DASH price
        updateAssetPrices.call(this)

        this.isLoading = false
        log('info', 'Balances and transactions refreshed.')
    }, 'REFRESH_BALANCES_FAILED')
}
