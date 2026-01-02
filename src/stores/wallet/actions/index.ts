// src/stores/wallet/actions/index.ts

/* Import modules. */
import { getIdentityBalance } from '@evonext/platform'
import { useSystemStore } from '../../system'
import { ErrorBoundary } from '@/utils/errors'
import { log, isTestnet } from '@/utils/env'

// REFACTOR: Import Composables instead of @/libs
import { usePlatformSdk } from '@/composables/usePlatformSdk'
import { useWallet } from '@/composables/useWallet'

/* Import utilities. */
import { fetchIdentityTransfers, fetchTokenTransitions } from './api'
import {
    createUpdatedAssets,
    processTokenBalances,
    transformIdentityTransfer,
    transformTokenTransitions
} from './transforms'

/* Import types. */
import type { ITransaction, IUser, IAsset } from '@/types'

// Type for the wallet store context
interface WalletStoreContext {
    user: IUser | null
    assets: IAsset[]
    transactions: ITransaction[]
    isLoading: boolean
}

export async function fetchLiveBalances(this: WalletStoreContext) {
    return ErrorBoundary.wrap(async () => {
        // Get address from user (either address or identityId)
        const identityId = this.user?.address || this.user?.identityId
        if (!identityId) {
            log('warn', 'No user identity available for balance fetch')
            return
        }

        // REFACTOR: Use composable to get network info
        const { getSDK } = usePlatformSdk()
        const sdk = await getSDK()
        const network = (this.user as any)?.network || (sdk as any).options?.network || 'testnet'

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
        const { getAllActiveTokens } = await import('@/constants')
        const activeTokens = getAllActiveTokens()

        // REFACTOR: Fetch balances individually using useWallet composable
        const wallet = useWallet()
        const tokenBalances: any[] = []

        if (Array.isArray(activeTokens)) {
            for (const tokenConfig of activeTokens) {
                try {
                    // Assuming tokenConfig has a structure like { id: string, decimals: number, ... }
                    // We extract the contract ID (id or contractId)
                    // const contractId = tokenConfig.id || tokenConfig.contractId || tokenConfig
                    const contractId = tokenConfig

                    const balance = await wallet.getTokenBalance(identityId, contractId)

                    tokenBalances.push({
                        tokenId: contractId, // Store the ID for reference
                        balance: balance     // The BigInt balance
                    })
                } catch (err) {
                    log('warn', `Failed to fetch balance for token ${tokenConfig}:`, err)
                }
            }
        }

        log('info', 'Token balances:', tokenBalances)

        // Process token balances
        const { dusdBalance, sansBalance } = processTokenBalances(tokenBalances, isTestnet())
        log('info', `DUSD balance: ${dusdBalance}, SANS balance: ${sansBalance}`)

        // Update assets array with live data and proper USD values
        const updatedAssets = createUpdatedAssets(
            dashBalance,
            creditsBalance,
            dusdBalance,
            sansBalance,
            system.currentDashPrice
        )
        this.assets = updatedAssets.filter(asset => (asset.balance as number) > 0 || asset.symbol === 'DASH')

    }, 'FETCH_LIVE_BALANCES_FAILED')
}

export async function fetchRealTransactions(this: WalletStoreContext, limit: number = 20) {
    return ErrorBoundary.wrap(async () => {
        // Get address from user (either address or identityId)
        const identityId = this.user?.address || this.user?.identityId
        if (!identityId) {
            log('warn', 'No user identity available for transaction fetch')
            return
        }

        this.isLoading = true
        log('info', 'Fetching real transactions for:', identityId)

        try {
            // Import contract IDs dynamically to ensure correct network
            const { getDUSDContractId, getSANSContractId } = await import('@/constants')

            // Fetch identity transfers and token transitions concurrently
            const [identityTransfers, dusdTransitions, sansTransitions] = await Promise.all([
                fetchIdentityTransfers(identityId, limit),
                fetchTokenTransitions(getDUSDContractId(), limit),
                fetchTokenTransitions(getSANSContractId(), limit)
            ])

            // Transform identity transfers into transaction objects
            const identityTransactions: ITransaction[] = identityTransfers.map(transfer =>
                transformIdentityTransfer(transfer, identityId)
            )

            // Import decimal places
            const { DUSD_DECIMAL_PLACES, SANS_DECIMAL_PLACES } = await import('@/constants')

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
            // FIX: Ensure 'date' is handled correctly.
            // If transform functions return numbers (timestamps), convert to Date for sorting.
            this.transactions = [
                ...identityTransactions,
                ...dusdTransactions,
                ...sansTransactions
            ].sort((a, b) => {
                const timeA = typeof a.createdAt === 'number' ? a.createdAt : new Date(a.createdAt).getTime()
                const timeB = typeof b.createdAt === 'number' ? b.createdAt : new Date(b.createdAt).getTime()
                return timeB - timeA
            })

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

export async function refreshBalances(this: WalletStoreContext) {
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

        this.isLoading = false
        log('info', 'Balances and transactions refreshed.')
    }, 'REFRESH_BALANCES_FAILED')
}
