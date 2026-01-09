// src/stores/wallet/actions/index.ts
/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
import { useWalletStore } from '../index'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { fetchIdentityTransactions, fetchTokenBalance } from './api'
import { formatDashAmount, formatTokenAmount } from './utils'
import type { IAsset, ITransaction } from '@/types'
import type { IAssetMinimal } from '@/types/assets'
import type { Network } from '@/composables/useNetwork'

/**
 * Orchestrates fetching all balances (Native + Tokens)
 */
export async function refreshBalances(this: ReturnType<typeof useWalletStore>, network?: Network) {
    const identityStore = useIdentityStore()
    const systemStore = useSystemStore()

    if (!identityStore.isConnected) {
        console.warn('Cannot refresh balances: Identity not connected')
        return
    }

    // Update store state if network is provided
    if (network) {
        this.network = network
    }

    this.isLoading = true

    // FIX: Use .identityId instead of .id
    const identityId = identityStore.identity?.identityId || identityStore.identityId

    if (!identityId) {
        console.error('Cannot refresh balances: No Identity ID found in store.')
        this.isLoading = false
        return
    }

    console.log(`🔄 Refreshing balances for ID: ${identityId} on ${this.network}`)

    // 1. Initialize Asset List with Native Dash/Credits
    const newAssets: IAsset[] = []

    // Add Credits (Native)
    const creditBalance = identityStore.balance && !isNaN(Number(identityStore.balance))
        ? Number(identityStore.balance)
        : 0

    newAssets.push({
        id: 'credits',
        name: 'Dash Credits',
        symbol: 'CREDITS',
        decimals: 2,
        type: 'native',
        category: 'currency',
        network: this.network,
        balance: creditBalance,
        balanceFormatted: creditBalance.toLocaleString(),
        verified: true,
        blocked: false,
        transferable: true,
        divisible: true,
        ownerIdentityId: identityId,
        isOwned: true,
        usdValue: 0
    })

    // Add DASH (Layer 1 representation)
    // 1 Dash = 100,000,000 duffs = 100,000,000,000 credits
    const dashAmount = creditBalance / 100000000000

    newAssets.push({
        id: 'dash',
        name: 'Dash',
        symbol: 'DASH',
        decimals: 8,
        type: 'native',
        category: 'currency',
        network: this.network,
        balance: dashAmount,
        balanceFormatted: formatDashAmount(dashAmount, true),
        verified: true,
        blocked: false,
        transferable: true,
        divisible: true,
        ownerIdentityId: identityId,
        isOwned: true,
        usdValue: dashAmount * (systemStore.currentDashPrice || 0)
    })

    try {
        // 2. Load Custom Assets via Discovery (Rust Command)
        const storedAssets = await invoke<IAssetMinimal[]>('discover_assets', {
            network: this.network
        })

        if (storedAssets && Array.isArray(storedAssets)) {
            console.log(`📦 Discovered ${storedAssets.length} assets on ${this.network}`)

            for (const assetDef of storedAssets) {
                let balance = BigInt(0)
                let balanceFormatted = '0.00'
                let contractId = ''

                // EXTRACT CONTRACT ID from Discovery Result
                // The Rust command returns 'asset_id' which holds the Contract ID
                // IAssetMinimal maps to this via asset_id?: string
                const rawContractId = assetDef.asset_id || ''

                if (rawContractId) {
                    contractId = rawContractId
                } else {
                    // Fallback if missing ID
                    contractId = `${assetDef.symbol}-${identityId}`
                }

                // Verify we found an ID before trying to fetch balance
                if (contractId && contractId.length > 10) {
                    try {
                        balance = await fetchTokenBalance(identityId, contractId, this.network)

                        // Extract decimals
                        // Rust struct AssetDefinition uses snake_case 'decimals: Option<u8>'
                        // IAssetMinimal maps to 'decimals?: number'

                        const decimalPlaces = assetDef.decimals || 18

                        const divisor = BigInt(10 ** decimalPlaces)
                        const whole = balance / divisor
                        balanceFormatted = whole.toString()
                    } catch (err) {
                        console.error(`Failed to fetch balance for ${assetDef.symbol}:`, err)
                    }
                }

                newAssets.push({
                    id: contractId,
                    name: assetDef.name,
                    symbol: assetDef.symbol,
                    decimals: assetDef.decimals || 18,
                    type: 'token',
                    category: 'utility',
                    network: this.network,
                    balance: balance.toString(),
                    balanceFormatted: balanceFormatted,
                    verified: true,
                    blocked: false,
                    transferable: true,
                    divisible: true,
                    ownerIdentityId: identityId,
                    isOwned: true,
                    contractId: contractId
                })
            }
        }
    } catch (err) {
        console.error('Failed to discover assets:', err)
    }

    this.assets = newAssets
    console.log(`✅ Assets updated. Total: ${newAssets.length}`)

    // 3. Fetch Transactions
    await this.fetchRealTransactions()
    this.isLoading = false
}

export async function fetchLiveBalances(this: ReturnType<typeof useWalletStore>) {
    await this.refreshBalances()
}

/**
 * Fetches transactions from the Explorer API
 */
export async function fetchRealTransactions(this: ReturnType<typeof useWalletStore>, limit: number = 20) {
    const identityStore = useIdentityStore()

    // FIX: Use .identityId instead of .id
    const identityId = identityStore.identity?.identityId || identityStore.identityId

    if (!identityId) {
        console.warn('Cannot fetch transactions: No Identity ID')
        return
    }

    try {
        console.log(`🕵️ Fetching transactions for ${identityId} on ${this.network} from Explorer...`)
        const explorerTxs = await fetchIdentityTransactions(identityId, limit, this.network)

        console.log(`✅ Explorer returned ${explorerTxs.length} transactions`)

        // Map Explorer format to ITransaction UI format
        this.transactions = explorerTxs.map((tx: any): ITransaction => {
            const isSender = tx.sender === identityId
            const isRecipient = tx.recipient === identityId

            let title = 'Transaction'
            let subtitle = new Date(tx.timestamp).toLocaleString()
            let amountFormatted = '0'
            let type: any = 'UNKNOWN'
            let status: 'Completed' | 'Pending...' | 'Failed' = 'Completed'

            // Calculate Direction
            let direction: 'INCOMING' | 'OUTGOING' | 'SELF' = 'SELF'
            if (isSender && !isRecipient) direction = 'OUTGOING'
            if (!isSender && isRecipient) direction = 'INCOMING'

            // FIX: Initialize assetSymbol based on the transaction data
            let assetSymbol = 'CREDITS'
            let assetType: 'COIN' | 'TOKEN' = 'COIN'

            // If the transaction payload contains symbol info (like from the token list)
            if (tx.token && tx.token.symbol) {
                assetSymbol = tx.token.symbol
                assetType = 'TOKEN'
            } else if (tx.symbol) {
                 // Or if it's just a flat property
                assetSymbol = tx.symbol
                assetType = 'TOKEN'
            }

            // FIX: Correct if syntax
            if (tx.type === 'IDENTITY_CREDIT_TRANSFER') {
                type = 'IDENTITY_CREDIT_TRANSFER'
                title = isSender ? 'Sent Credits' : 'Received Credits'
                // FIX: Explorer API returns 'amount' at root level
                const rawAmount = tx.amount || 0
                amountFormatted = `${Number(rawAmount).toLocaleString()} Credits`
            } else if (tx.type === 'IDENTITY_TOP_UP') {
                type = 'IDENTITY_TOP_UP'
                title = 'Identity Top Up'
                amountFormatted = 'N/A'
            } else if (tx.type === 'IDENTITY_CREATE') {
                type = 'IDENTITY_CREATE'
                title = 'Identity Created'
                amountFormatted = 'N/A'
            } else if (tx.type === 'DATA_CONTRACT_TRANSFER') {
                // Generic Token Transfer
                type = 'DATA_CONTRACT_TRANSFER'
                title = isSender ? `Sent ${assetSymbol}` : `Received ${assetSymbol}`

                const rawAmount = tx.amount || tx.value || 0
                // Use formatTokenAmount for tokens
                const decimals = tx.decimals || 8 // Fallback if not in tx
                amountFormatted = formatTokenAmount(rawAmount, assetSymbol, decimals, false)
            }

            // FIX: Explorer API uses 'txHash'
            const txHash = tx.txHash || tx.hash || ''

            return {
                id: txHash,
                hash: txHash,
                confirmations: 1,
                senderId: tx.sender || 'Unknown',
                receiverId: tx.recipient || 'Unknown',
                amount: tx.amount || 0,
                amountFormatted,
                assetType,
                assetSymbol, // FIX: Explicitly assigned
                status,
                type,
                direction,
                title,
                subtitle,
                date: new Date(tx.timestamp).getTime(),
                createdAt: new Date(tx.timestamp).getTime(),
                network: this.network
            }
        })

        console.log(`✅ Mapped ${this.transactions.length} transactions for UI`)
    } catch (err) {
        console.error('Failed to fetch real transactions:', err)
    }
}
