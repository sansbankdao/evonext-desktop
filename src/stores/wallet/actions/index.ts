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

    if (network) {
        this.network = network
    }

    this.isLoading = true

    const identityId = identityStore.identity?.identityId || identityStore.identityId
    if (!identityId) {
        console.error('Cannot refresh balances: No Identity ID found.')
        this.isLoading = false
        return
    }

    const identityBalance = identityStore.balance
    let creditBalance = 0
    if (identityBalance) {
        const parsed = Number(identityBalance)
        if (!isNaN(parsed)) creditBalance = parsed
    }

    if (creditBalance === 0 || creditBalance < 1) {
        try {
            let getIdentityBalance
            try {
                // FIXED: dynamic import with 'as any'
                const mod = await import('@/services/identity/discovery/IdentityManager') as any
                getIdentityBalance = mod.getIdentityBalance || mod.default?.getIdentityBalance
            } catch (e) {
                getIdentityBalance = (window as any)?.invoke
            }

            if (typeof getIdentityBalance === 'function') {
                const nwMod = await import('@/composables/useNetwork') as any
                const nw = await nwMod.default?.ensure() || await nwMod.ensure()
                const freshBalance = await getIdentityBalance(identityId, nw)
                identityStore.balance = String(freshBalance)
                identityStore.balanceBigInt = BigInt(freshBalance)
                identityStore.dashBigInt = identityStore.balanceBigInt / BigInt(100_000_000_000)
                creditBalance = Number(freshBalance)
            }
        } catch (e) {
            console.error('Direct fetch failed:', e)
        }
    }

    const newAssets: IAsset[] = []

    // Add Credits (Native)
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

    // Add DASH
    const dashAmount = creditBalance / 100000000000
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

    try {
        let storedAssets: IAssetMinimal[] = await invoke<IAssetMinimal[]>('fetch_identity_tokens', {
            identityId: identityId,
            network: this.network
        })

        if (storedAssets && Array.isArray(storedAssets)) {
            for (const assetDef of storedAssets) {
                let balance = BigInt(0)
                let balanceFormatted = '0.00'
                const symbol = assetDef.symbol || ''
                const rawContractId = assetDef.asset_id || ''
                let decimalPlaces = assetDef.decimals || 8

                if (symbol.toUpperCase().includes('DUSD')) decimalPlaces = 6

                if (assetDef.balance !== undefined && assetDef.balance !== null) {
                    balance = BigInt(assetDef.balance)
                    const divisor = BigInt(10 ** decimalPlaces)
                    const whole = balance / divisor
                    const remainder = balance % divisor
                    const remainderStr = remainder.toString().padStart(decimalPlaces, '0')
                    const trimmedRemainder = remainderStr.replace(/0+$/, '')
                    balanceFormatted = trimmedRemainder === '' ? `${whole.toLocaleString()}` : `${whole.toLocaleString()}.${trimmedRemainder}`
                }

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
        console.error('Failed to discover assets:', err)
    }

    newAssets.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
    this.assets = newAssets

    await this.fetchRealTransactions()
    this.isLoading = false
    window.dispatchEvent(new CustomEvent('wallet:balances-refreshed', { detail: { creditBalance } }))
}

export async function fetchLiveBalances(this: ReturnType<typeof useWalletStore>) {
    await this.refreshBalances()
}

/**
 * Fetches transactions from the Explorer API and maps with proper Sent/Received titles
 */
export async function fetchRealTransactions(this: ReturnType<typeof useWalletStore>, limit: number = 20) {
    const identityStore = useIdentityStore()
    const identityId = identityStore.identity?.identityId || identityStore.identityId
    if (!identityId) return

    try {
        const explorerTxs = await fetchIdentityTransactions(identityId, limit, this.network)

        this.transactions = explorerTxs.map((tx: any): ITransaction => {
            const isSender = tx.sender === identityId
            const isRecipient = tx.recipient === identityId
            const hash = tx.hash || tx.txHash || ''

            let assetSymbol = tx.token?.symbol || tx.symbol || 'CREDITS'
            let assetType: 'COIN' | 'TOKEN' = assetSymbol === 'CREDITS' ? 'COIN' : 'TOKEN'

            // --- Determine Title (Sent vs Received) ---
            let title = 'Transaction'
            if (tx.type === 'IDENTITY_CREDIT_TRANSFER') {
                title = isSender ? 'Sent Credits' : 'Received Credits'
            } else if (tx.type === 'BATCH' && tx.batchType === 'TOKEN_TRANSFER') {
                title = isSender ? `Sent ${assetSymbol}` : `Received ${assetSymbol}`
            } else if (tx.type === 'IDENTITY_TOP_UP') {
                title = 'Identity Top Up'
            } else if (tx.type === 'IDENTITY_CREATE') {
                title = 'Identity Created'
            }

            // --- Format Amount ---
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
        console.error('Failed to fetch real transactions:', err)
    }
}
