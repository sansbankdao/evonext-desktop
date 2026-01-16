// src/stores/wallet/actions/index.ts

/* Import modules. */
import { invoke } from '@tauri-apps/api/core'
import { useWalletStore } from '../index'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { useNetwork } from '@/composables/useNetwork'
import { fetchIdentityTransactions } from './api'
import { formatDashAmount } from './utils'
import type { IAsset, ITransaction } from '@/types'
import type { IAssetMinimal } from '@/types/assets'
import type { Network } from '@/composables/useNetwork'

/**
 * Orchestrates fetching all balances (Native + Tokens)
 * Refactored to eliminate recursive network loops and fix property mismatches.
 */
export async function refreshBalances(
    this: ReturnType<typeof useWalletStore>,
    network?: Network
) {
    const identityStore = useIdentityStore()
    const systemStore = useSystemStore()
    const { ensure } = useNetwork()

    // 1. Connection Guard
    if (!identityStore.isConnected) {
        console.warn('[Wallet] Cannot refresh: Identity not connected')
        return
    }

    // 2. Set Active Network
    if (network) {
        this.network = network
    } else {
        this.network = await ensure()
    }

    this.isLoading = true

    // 3. Resolve Identity ID (Matches storage.ts naming)
    const identityId = identityStore.identity?.identityId || identityStore.identityId
    if (!identityId) {
        console.error('[Wallet] Cannot refresh: No Identity ID found.')
        this.isLoading = false
        return
    }

    // 4. Resolve Credit Balance
    // We rely on identityStore logic to handle the DAPI fetch
    await identityStore.fetchBalance()

    let creditBalance = 0
    if (identityStore.balance) {
        const parsed = Number(identityStore.balance)
        if (!isNaN(parsed)) creditBalance = parsed
    }

    const newAssets: IAsset[] = []

    // 5. Add Credits (Native Platform Asset)
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

    // 6. Add DASH (Computed from Credits)
    const dashAmount = creditBalance / 100_000_000_000
    const currentDashPrice = systemStore.currentDashPrice || 0
    const dashUsdValue = dashAmount * currentDashPrice

    newAssets.push({
        id: 'dash',
        name: 'Dash Coins',
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
        usdValue: dashUsdValue
    })

    // 7. Fetch Token Balances from Rust Backend
    try {
        const storedAssets = await invoke<IAssetMinimal[]>('fetch_identity_tokens', {
            identityId: identityId,
            network: this.network
        })

        if (Array.isArray(storedAssets)) {
            for (const assetDef of storedAssets) {
                const symbol = assetDef.symbol || ''
                const rawContractId = assetDef.asset_id || ''
                let decimalPlaces = assetDef.decimals || 8

                // Handle specific token overrides
                if (symbol.toUpperCase().includes('DUSD')) decimalPlaces = 6

                let balance = BigInt(0)
                let balanceFormatted = '0.00'

                if (assetDef.balance !== undefined && assetDef.balance !== null) {
                    balance = BigInt(assetDef.balance)
                    const divisor = BigInt(10 ** decimalPlaces)
                    const whole = balance / divisor
                    const remainder = balance % divisor
                    const remainderStr = remainder.toString().padStart(decimalPlaces, '0')
                    const trimmedRemainder = remainderStr.replace(/0+$/, '')

                    balanceFormatted = trimmedRemainder === ''
                        ? whole.toLocaleString()
                        : `${whole.toLocaleString()}.${trimmedRemainder}`
                }

                // Compute USD Values for known tokens
                let usdValue = 0
                const balanceNum = Number(balance) / (10 ** decimalPlaces)
                if (symbol.toUpperCase().includes('DUSD')) usdValue = balanceNum * 1.0
                if (symbol.toUpperCase().includes('SANS')) usdValue = balanceNum * 0.16

                newAssets.push({
                    id: rawContractId || `token-${symbol.toLowerCase()}`,
                    name: assetDef.name || symbol,
                    symbol: symbol,
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
                    usdValue: usdValue,
                })
            }
        }
    } catch (err) {
        console.error('[Wallet] Failed to fetch token assets:', err)
    }

    // 8. Finalize State
    newAssets.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
    this.assets = newAssets

    // 9. Fetch Transactions
    await this.fetchRealTransactions()

    this.isLoading = false
    window.dispatchEvent(new CustomEvent('wallet:balances-refreshed', {
        detail: { creditBalance }
    }))
}

export async function fetchLiveBalances(this: ReturnType<typeof useWalletStore>) {
    await this.refreshBalances()
}

/**
 * Fetches transactions from the Explorer API
 */
export async function fetchRealTransactions(
    this: ReturnType<typeof useWalletStore>,
    limit: number = 20
) {
    const identityStore = useIdentityStore()
    const identityId = identityStore.identity?.identityId || identityStore.identityId
    if (!identityId) return

    try {
        const explorerTxs = await fetchIdentityTransactions(identityId, limit, this.network)

        this.transactions = explorerTxs.map((tx: any): ITransaction => {
            const isSender = tx.sender === identityId
            const isRecipient = tx.recipient === identityId
            const hash = tx.hash || tx.txHash || ''

            const assetSymbol = tx.token?.symbol || tx.symbol || 'CREDITS'
            const assetType = assetSymbol === 'CREDITS' ? 'COIN' : 'TOKEN'

            let title = 'Transaction'
            if (tx.type === 'IDENTITY_CREDIT_TRANSFER') {
                title = isSender ? 'Sent Credits' : 'Received Credits'
            } else if (tx.type === 'BATCH' && tx.batchType === 'TOKEN_TRANSFER') {
                title = isSender ? `Sent ${assetSymbol}` : `Received ${assetSymbol}`
            } else if (tx.type === 'IDENTITY_TOP_UP') {
                title = 'Identity Top Up'
            }

            let amountFormatted = '0'
            const rawAmount = Number(tx.amount || tx.value || 0)
            const asset = this.assets.find(a => a.symbol === assetSymbol)
            const decimals = asset?.decimals || (assetSymbol.toUpperCase().includes('DUSD') ? 6 : 8)

            if (assetSymbol === 'CREDITS') {
                amountFormatted = `${rawAmount.toLocaleString()} Credits`
            } else {
                amountFormatted = `${(rawAmount / (10 ** decimals)).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: decimals
                })} ${assetSymbol}`
            }

            return {
                id: hash,
                hash: hash,
                confirmations: 1,
                senderId: tx.sender || 'Unknown',
                receiverId: tx.recipient || 'Unknown',
                amount: rawAmount,
                amountFormatted,
                assetType,
                assetSymbol,
                status: 'Completed',
                type: tx.type,
                direction: isSender ? (isRecipient ? 'SELF' : 'OUTGOING') : 'INCOMING',
                title,
                subtitle: new Date(tx.timestamp).toLocaleString(),
                date: new Date(tx.timestamp).getTime(),
                createdAt: new Date(tx.timestamp).getTime(),
                network: this.network as any
            }
        })
    } catch (err) {
        console.error('[Wallet] Failed to fetch real transactions:', err)
    }
}
