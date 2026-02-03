// src/stores/wallet/actions/index.ts

/* Import modules. */
import { invoke } from '@/utils/tauri'
import { useWalletStore } from '../index'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { useNetwork } from '@/composables/useNetwork'
import { fetchIdentityTransactions } from './api'
import { formatDashAmount } from './utils'
import { transformIdentityTransfer } from './transforms'
import type { IAsset } from '@/types'
import type { IAssetMinimal } from '@/types/assets'
import type { Network } from '@/composables/useNetwork'

/**
 * Orchestrates fetching all balances (Native + Tokens)
 */
export async function refreshBalances(
    this: ReturnType<typeof useWalletStore>,
    network?: Network
) {
    const identityStore = useIdentityStore()
    const systemStore = useSystemStore()
    const { ensure } = useNetwork()

    if (!identityStore.isConnected) {
        console.warn('[Wallet] Cannot refresh: Identity not connected')
        return
    }

    if (network) {
        this.network = network
    } else {
        this.network = await ensure()
    }

    this.isLoading = true

    const identityId = identityStore.identityId || identityStore.identity?.identityId

    if (!identityId) {
        console.error('[Wallet] Cannot refresh: No Identity ID found.')
        this.isLoading = false
        return
    }

    await identityStore.fetchBalance()

    let creditBalance = 0
    if (identityStore.balance) {
        const parsed = Number(identityStore.balance)
        if (!isNaN(parsed)) creditBalance = parsed
    }

    const newAssets: IAsset[] = []

    newAssets.push({
        id: 'credits',
        name: 'Dash',
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

                if (symbol.toUpperCase().includes('DUSD')) decimalPlaces = 6

                let balance = BigInt(0)
                let balanceFormatted = '0.00'

                if (assetDef.balance !== undefined && assetDef.balance !== null) {
                    balance = BigInt(String(assetDef.balance))
                    const divisor = BigInt(10 ** decimalPlaces)
                    const whole = balance / divisor
                    const remainder = balance % divisor
                    const remainderStr = remainder.toString().padStart(decimalPlaces, '0')
                    const trimmedRemainder = remainderStr.replace(/0+$/, '')

                    balanceFormatted = trimmedRemainder === ''
                        ? whole.toLocaleString()
                        : `${whole.toLocaleString()}.${trimmedRemainder}`
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
        console.error('[Wallet] Failed to fetch token assets:', err)
    }

    newAssets.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0))
    this.assets = newAssets

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
    const identityId = identityStore.identityId || identityStore.identity?.identityId

    if (!identityId) return

    try {
        const response = await fetchIdentityTransactions(identityId, limit, this.network)

        // FIX: Unwrap the ActionResponse to get the array
        const explorerTxs = (response as any)?.data ?? response ?? []

        if (Array.isArray(explorerTxs)) {
            const mappedTransactions = explorerTxs.map((tx: any) =>
                transformIdentityTransfer(tx, identityId)
            )
            this.transactions = mappedTransactions
        }
    } catch (err) {
        console.error('[Wallet] Failed to fetch real transactions:', err)
    }
}
