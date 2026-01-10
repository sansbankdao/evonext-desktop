/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
import { useWalletStore } from '../index'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { fetchIdentityTransactions } from './api'
import { formatDashAmount } from './utils'
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
    console.log(`🔄 [wallet:refreshBalances] Starting refresh for ID: ${identityId} on ${this.network}`)
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
        decimals: 2, // Fixed for Credits
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
        name: 'Dash Coins',
        symbol: 'DASH',
        decimals: 8, // Fixed for DASH
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
        // 2. Load Custom Assets via NEW Rust Command (fetch_identity_tokens)
        console.log(`📡 [wallet:refreshBalances] Calling fetch_identity_tokens with identityId: "${identityId}", network: "${this.network}"`)
        let storedAssets: IAssetMinimal[] = []
        try {
            // IMPORTANT: Use the exact parameter names as defined in Rust
            storedAssets = await invoke<IAssetMinimal[]>('fetch_identity_tokens', {
                identityId: identityId,
                network: this.network
            })
            console.log(`✅ [wallet:refreshBalances] invoke succeeded!`)
            console.log(`✅ [wallet] Raw response type: ${typeof storedAssets}`)
            console.log(`✅ [wallet] Is array: ${Array.isArray(storedAssets)}`)
            console.log(`✅ [wallet] Response length: ${storedAssets?.length || 0}`)
            console.log(`✅ [wallet] Full response:`, JSON.stringify(storedAssets, null, 2))
        } catch (invokeError) {
            console.error('❌ [wallet:refreshBalances] Invoke threw exception:', invokeError)
            console.error('❌ [wallet] Error details:', invokeError)
            storedAssets = []
        }
        if (storedAssets && Array.isArray(storedAssets)) {
            console.log(`📦 [wallet] Retrieved ${storedAssets.length} assets from Explorer`)

            for (const assetDef of storedAssets) {
                console.log(`📦 [wallet] Processing asset:`, JSON.stringify(assetDef, null, 2))

                let balance = BigInt(0)
                let balanceFormatted = '0.00'

                // Keep the symbol exactly as returned from Rust (could be tSANS, tDUSD, SANS, DUSD)
                const symbol = assetDef.symbol || ''
                const rawContractId = assetDef.asset_id || ''

                // Determine decimals based on symbol (testnet vs mainnet)
                let decimalPlaces = assetDef.decimals || 8 // Default 8

                // Check for DUSD/DASH USD (6 decimals) or tDUSD (6 decimals)
                if (symbol.toUpperCase() === 'DUSD' || symbol.toUpperCase() === 'TDUSD') {
                    decimalPlaces = 6
                } else if (symbol.toUpperCase() === 'SANS' || symbol.toUpperCase() === 'TSANS') {
                    decimalPlaces = 8
                }

                // EXTRACT: Balance from Rust
                if (assetDef.balance !== undefined && assetDef.balance !== null) {
                    try {
                        balance = BigInt(assetDef.balance)
                        // Format using the correct decimals
                        const divisor = BigInt(10 ** decimalPlaces)
                        const whole = balance / divisor
                        const remainder = balance % divisor

                        // Convert to Number for formatting
                        const wholeNum = Number(whole)
                        const remainderStr = remainder.toString().padStart(decimalPlaces, '0')
                        const trimmedRemainder = remainderStr.replace(/0+$/, '')

                        if (trimmedRemainder === '') {
                            balanceFormatted =`${wholeNum.toLocaleString()}`
                        } else {
                            balanceFormatted =`${wholeNum.toLocaleString()}.${trimmedRemainder}`
                        }
                    } catch (err) {
                        console.error(`[wallet] Failed to parse balance for ${symbol}:`, err)
                        console.error(`[wallet] Balance value was:`, assetDef.balance)
                        balanceFormatted = '0.00'
                    }
                } else {
                    console.warn(`[wallet] Asset ${symbol} has no balance field`)
                }

                // Calculate USD value based on symbol (case-insensitive)
                let usdValue = 0
                const symbolUpper = symbol.toUpperCase()

                if (symbolUpper === 'DUSD' || symbolUpper === 'TDUSD') {
                    // DUSD is $1.00 stablecoin
                    const balanceNum = Number(balance) / (10 ** decimalPlaces)
                    usdValue = balanceNum * 1.00
                } else if (symbolUpper === 'SANS' || symbolUpper === 'TSANS') {
                    // SANS is $0.16 per requirement
                    const balanceNum = Number(balance) / (10 ** decimalPlaces)
                    usdValue = balanceNum * 0.16
                }

                // Format a nice display name (remove 't' prefix for display if present)
                let displayName = assetDef.name || symbol

                // Ensure we have an asset_id for the id field
                const assetId = rawContractId || `token-${symbol.toLowerCase()}`

                newAssets.push({
                    id: assetId,
                    name: displayName,
                    symbol: symbol, // Keep original symbol (tSANS or SANS)
                    decimals: decimalPlaces,
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
                    contractId: rawContractId,
                    usdValue: usdValue
                })
            }
        }
    } catch (err) {
        console.error('🚨 [wallet:refreshBalances] Failed to discover assets:', err)
    }
    this.assets = newAssets
    console.log(`✅ [wallet:refreshBalances] Assets updated. Total: ${newAssets.length}`)
    console.log(`✅ [wallet] Asset symbols:`, newAssets.map(a => `${a.symbol} (${a.balance})`))
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
        console.log(`🕵️  Fetching transactions for ${identityId} on ${this.network} from Explorer...`)
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
            // Initialize assetSymbol based on transaction data
            let assetSymbol = 'CREDITS'
            let assetType: 'COIN' | 'TOKEN' = 'COIN'
            // If transaction payload contains symbol info
            if (tx.token && tx.token.symbol) {
                assetSymbol = tx.token.symbol
                assetType = 'TOKEN'
            } else if (tx.symbol) {
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
                // Determine decimals for formatting
                const discoveredAsset = this.assets.find(a => a.symbol === assetSymbol)
                const decimals = discoveredAsset?.decimals || 8 // Fallback to 8 (DASH) if unknown
                amountFormatted = `${Number(rawAmount).toLocaleString(undefined, {
                    minimumFractionDigits: decimals > 2 ? 2 : decimals,
                    maximumFractionDigits: decimals
                })} ${assetSymbol}`
            }
            // FIX: Explorer API uses 'txHash' or 'hash'
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
