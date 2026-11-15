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
import { transactionToRecord, recordToTransaction } from './historySync'
import { useTransactionHistory } from '@/composables/useTransactionHistory'
import type { IAsset } from '@/types'
import type { IAssetMinimal } from '@/types/assets'
import type { Network } from '@/composables/useNetwork'

/* Shielded catch-up (F40–F55 parity): the Transparent row is the DIP-17
 * Platform-address pool (evonext.app F46), the Shielded row is ALWAYS
 * rendered (F45) and instant-seeds from the persisted engine sync state.
 * The identity balance is NOT a wallet row — it lives under the username
 * on the dashboard and in the TOTAL (the owner's 4-row model: Transparent,
 * Shielded, SANS, DUSD; the mobile balance-model handoff). */
import { fetchPlatformAddressBalance } from '@/lib/platform-address'
import { persistedShieldedBalance } from '@/lib/shielded/engine-client'
import { getWasmSdk } from '@/lib/services/wasm-sdk-service'

/** Bounded + retried Transparent balance (the F50a semantics: 3 attempts,
 *  90s each — the wasm request-timeout can leave a query pending forever,
 *  the F30 gotcha). */
async function fetchTransparentBalanceBounded(network: Network): Promise<bigint | null> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const sdk = await getWasmSdk()
            return await Promise.race([
                fetchPlatformAddressBalance(sdk, network, 20),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`transparent balance timed out (attempt ${attempt})`)), 90000)),
            ])
        } catch (error) {
            console.warn(`[Wallet] Transparent balance attempt ${attempt} failed:`, error)
            if (attempt === 3) return null
            await new Promise(resolve => setTimeout(resolve, 8000))
        }
    }
    return null
}

/** The 4-decimal trimmed row format (the F43 row contract:
 *  131,100,000 credits -> '0.0013'). */
function formatCreditsRow(credits: bigint | null): string {
    if (credits === null || credits === 0n) return '0'
    const dash = Number(credits) / 100_000_000_000
    return dash.toFixed(4).replace(/\.?0+$/, '')
}

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

    const currentDashPrice = systemStore.currentDashPrice || 0

    const newAssets: IAsset[] = []

    /* ROW 1 — Transparent: the DIP-17 Platform-address POOL balance (NOT
     * the identity balance — F46). Bounded+retried; a total transport
     * failure renders the row at 0 rather than removing it. */
    const transparentCredits = await fetchTransparentBalanceBounded(this.network)
    const transparentDash = transparentCredits === null ? 0 : Number(transparentCredits) / 100_000_000_000
    newAssets.push({
        id: 'transparent',
        name: 'Transparent',
        symbol: 'DASH',
        decimals: 11,
        type: 'native',
        category: 'currency',
        network: this.network,
        balance: transparentCredits === null ? '0' : transparentCredits.toString(),
        balanceFormatted: formatCreditsRow(transparentCredits),
        verified: true,
        blocked: false,
        transferable: true,
        divisible: true,
        ownerIdentityId: identityId,
        isOwned: true,
        usdValue: transparentDash * currentDashPrice
    })

    /* ROW 2 — Shielded: ALWAYS rendered, right after Transparent, even at
     * ZERO and before the engine scan lands (F45). Instant-seeded from the
     * persisted sync state; the live scan refines it via the engine's
     * onScanStatus (the composable overlays it in the UI). */
    const shieldedCredits = persistedShieldedBalance(this.network === 'mainnet' ? 'mainnet' : 'testnet') ?? 0n
    const shieldedDash = Number(shieldedCredits) / 100_000_000_000
    newAssets.push({
        id: 'shielded',
        name: 'Shielded',
        symbol: 'DASH',
        decimals: 11,
        type: 'native',
        category: 'currency',
        network: this.network,
        balance: shieldedCredits.toString(),
        balanceFormatted: formatCreditsRow(shieldedCredits),
        verified: true,
        blocked: false,
        transferable: true,
        divisible: true,
        ownerIdentityId: identityId,
        isOwned: true,
        usdValue: shieldedDash * currentDashPrice
    })

    /* The identity balance is intentionally NOT a row here — the dashboard
     * header shows it (Overview) and the TOTAL sums all three pools.
     * (formatDashAmount stays imported for the dashboard formatter.) */
    void formatDashAmount

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

    /* Row order is FIXED (Transparent, Shielded, then tokens) — the
     * F43/F45 parity contract; the old usdValue sort is gone. */
    this.assets = newAssets

    await this.fetchRealTransactions()

    this.isLoading = false
    window.dispatchEvent(new CustomEvent('wallet:balances-refreshed', {
        detail: { creditBalance, transparentCredits: transparentCredits?.toString() ?? null, shieldedCredits: shieldedCredits.toString() }
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

            // Persist to the local history DB (durable cache). Fire-and-
            // forget: cache writes must never block or fail the UI. The
            // upsert path upgrades pending -> confirmed in place.
            const history = useTransactionHistory()
            for (const tx of mappedTransactions) {
                history
                    .upsertTransaction(transactionToRecord(tx))
                    .catch((e: unknown) =>
                        console.warn('[Wallet] history cache upsert failed:', e)
                    )
            }
        }
    } catch (err) {
        console.error('[Wallet] Failed to fetch real transactions:', err)

        // Offline fallback: serve the durable local history so the wallet
        // still shows its past activity when the Explorer API is down.
        try {
            const history = useTransactionHistory()
            const cached = await history.listTransactions(this.network, limit, 0)
            if (cached.length > 0) {
                this.transactions = cached.map(recordToTransaction)
                console.info(`[Wallet] Serving ${cached.length} transactions from local history`)
            }
        } catch (cacheErr) {
            console.warn('[Wallet] Local history fallback failed:', cacheErr)
        }
    }
}
