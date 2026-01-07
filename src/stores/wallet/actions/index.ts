// src/stores/wallet/actions/index.ts
import { invoke } from '@tauri-apps/api/core'
import { useWalletStore } from '../index'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { fetchIdentityTransactions, fetchTokenBalance } from './api'
import { formatDashAmount } from './utils'
import type { IAsset, ITransaction } from '@/types'
import type { IAssetMinimal } from '@/types/assets'

/**
 * Orchestrates fetching all balances (Native + Tokens)
 */
export async function refreshBalances(this: ReturnType<typeof useWalletStore>) {
    const identityStore = useIdentityStore()
    const systemStore = useSystemStore()

    if (!identityStore.isConnected || !identityStore.identity?.id) {
        console.warn('Cannot refresh balances: Identity not connected')
        return
    }

    this.isLoading = true
    const identityId = identityStore.identity.id

    // 1. Initialize Asset List with Native Dash/Credits
    const newAssets: IAsset[] = []

    // Add Credits (Native)
    const creditBalance = identityStore.balance ? Number(identityStore.balance) : 0

    newAssets.push({
        id: 'credits', // <--- FIX: Added ID
        name: 'Dash Credits',
        symbol: 'CREDITS',
        precision: 2,
        type: 'native',
        category: 'currency',
        network: 'mainnet',
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

    // Add DASH (Layer 1 representation via Platform)
    // Calculating DASH from Credits for display (Approximate)
    const dashAmount = creditBalance / 100000000

    newAssets.push({
        id: 'dash', // <--- FIX: Added ID
        name: 'Dash',
        symbol: 'DASH',
        precision: 8,
        type: 'native',
        category: 'currency',
        network: 'mainnet',
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
        // 2. Load Custom Assets from Backend (Rust)
        const storedAssets = await invoke<IAssetMinimal[]>('load_assets', {
            network: 'mainnet'
        })

        if (storedAssets && Array.isArray(storedAssets)) {
            for (const assetDef of storedAssets) {
                let balance = BigInt(0)
                let balanceFormatted = '0.00'

                // Handle ID mapping: use asset_id from Rust, otherwise symbol/identity combo
                const contractId = assetDef.asset_id || (assetDef as any).assetId || (assetDef as any).contractId
                const assetId = contractId || `${assetDef.symbol}-${identityStore.identity?.id}`

                if (contractId) {
                    try {
                        balance = await fetchTokenBalance(identityId, contractId)
                        // TODO: Use actual precision from assetDef
                        const divisor = BigInt(10 ** (assetDef.precision || 18))
                        const whole = balance / divisor
                        balanceFormatted = whole.toString()
                    } catch (err) {
                        console.error(`Failed to fetch balance for ${assetDef.symbol}:`, err)
                    }
                }

                newAssets.push({
                    id: assetId, // <--- FIX: Added ID
                    name: assetDef.name,
                    symbol: assetDef.symbol,
                    precision: assetDef.precision || 18,
                    type: 'token',
                    category: 'utility',
                    network: assetDef.network || 'mainnet',
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
        console.error('Failed to load stored assets:', err)
    }

    this.assets = newAssets

    // 3. Fetch Transactions
    await this.fetchRealTransactions()
    this.isLoading = false
}

export async function fetchLiveBalances(this: ReturnType<typeof useWalletStore>) {
    await this.refreshBalances()
}

/**
 * Fetches transactions from the Explorer API and maps them to the UI model
 */
export async function fetchRealTransactions(this: ReturnType<typeof useWalletStore>, limit: number = 20) {
    const identityStore = useIdentityStore()
    if (!identityStore.identity?.id) return

    try {
        const explorerTxs = await fetchIdentityTransactions(identityStore.identity.id, limit)

        // Map Explorer format to ITransaction UI format
        this.transactions = explorerTxs.map((tx: any): ITransaction => {
            const isSender = tx.sender === identityStore.identity?.id

            let title = 'Transaction'
            let subtitle = new Date(tx.timestamp).toLocaleString()
            let amountFormatted = '0'
            let type: any = 'UNKNOWN'

            // Mapping based on Platform Explorer structure
            if (tx.type === 'IDENTITY_CREDIT_TRANSFER') {
                type = 'IDENTITY_CREDIT_TRANSFER'
                title = isSender ? 'Sent Credits' : 'Received Credits'
                const rawAmount = tx.data?.amount || 0
                amountFormatted = `${Number(rawAmount).toLocaleString()} Credits`
            } else if (tx.type === 'IDENTITY_TOP_UP') {
                title = 'Identity Top Up'
                amountFormatted = 'N/A'
            }

            const txHash = tx.hash || tx.txid || ''

            return {
                id: txHash, // <--- FIX: Map hash to id for UI lookup
                hash: txHash,
                confirmations: 1,
                senderId: tx.sender || 'Unknown',
                receiverId: tx.recipient || 'Unknown',
                amount: tx.data?.amount || 0,
                amountFormatted,
                assetType: 'COIN',
                assetSymbol: 'CREDITS',
                status: 'Completed',
                type,
                direction: isSender ? 'OUTGOING' : 'INCOMING',
                title,
                subtitle,
                date: new Date(tx.timestamp).getTime(),
                createdAt: new Date(tx.timestamp).getTime(),
                network: 'mainnet'
            }
        })
    } catch (err) {
        console.error('Failed to fetch real transactions:', err)
    }
}
