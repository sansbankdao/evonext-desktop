// src/stores/wallet/actions/index.ts
/* Import modules. */
import { getIdentityBalance } from '@evonext/platform'
import { useSystemStore } from '../../system'
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
/* Import utilities. */
import { fetchIdentityTransfers, fetchTokenTransitions } from './api'
import {
    createUpdatedAssets,
    processTokenBalances,
    transformIdentityTransfer,
    transformTokenTransitions
} from './transforms'
/* Import types. */
import type { ITransaction, IAsset } from '@/types'
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
        const creditsBalanceSatoshis = await getIdentityBalance(network, identityId)
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
        const { dusdBalance, sansBalance } = processTokenBalances(tokenBalances, isTestnet())
        log('info', `DUSD balance: ${dusdBalance}, SANS balance: ${sansBalance}`)
        // Update assets array with live data and proper USD values
        const updatedAssets = createUpdatedAssets(dashBalance, creditsBalance, dusdBalance, sansBalance, system.currentDashPrice)
        this.assets = updatedAssets.filter(asset => asset.amount > 0 || asset.ticker === 'DASH')
        this.updateAssetPrices()
    }, 'FETCH_LIVE_BALANCES_FAILED')
}
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
        this.updateAssetPrices()
        this.isLoading = false
        log('info', 'Balances and transactions refreshed.')
    }, 'REFRESH_BALANCES_FAILED')
}
