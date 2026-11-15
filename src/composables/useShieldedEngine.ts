// src/composables/useShieldedEngine.ts
//
// Vue composable over the shielded engine RPC client
// (src/lib/shielded/engine-client.ts — ported 1:1 from evonext.app F44).
// The wasm SDK + ZIP-32 keys + the note-tree sync run inside the engine
// WORKER; this composable owns the main-thread lifecycle:
//   - installDesktopProverTransport() — the prover rides the Rust command
//     (src-tauri/src/commands/shielded_commands.rs) because the prover
//     answers no CORS preflight;
//   - single-flight start(network, mnemonic) — mirrors the web's
//     engine-client.start() single-flight (F50c): every component that
//     calls ensureStarted() shares ONE engine;
//   - reactive balance (instant-seeded from the persisted sync state, then
//     refined by scan progress), history rows and send/settle actions.
//
// Units: ALL credit values are bigint Platform CREDITS; 1 DASH = 1e11
// credits (rs-dpp units.rs — the mobile-handoff constant). Conversion
// happens ONLY in creditsToDash/displayDash below (the single-boundary
// rule from the mobile balance-model handoff).

import { ref, computed } from 'vue'
import {
    shieldedEngine,
    persistedShieldedBalance,
    type ShieldedSnapshot,
    type ShieldedHistoryRow,
    type ShieldedSendResult,
} from '@/lib/shielded/engine-client'
import { installDesktopProverTransport } from '@/lib/desktop-prover'
import { mnemonicManager } from '@/composables/useMnemonic'
import { useNetwork } from '@/composables/useNetwork'

export type { ShieldedSnapshot, ShieldedHistoryRow, ShieldedSendResult } from '@/lib/shielded/engine-client'

export const CREDITS_PER_DASH = 100_000_000_000n

/** credits bigint -> DASH number (single conversion boundary). */
export const creditsToDash = (credits: bigint | null | undefined): number =>
    credits === null || credits === undefined ? 0 : Number(credits) / Number(CREDITS_PER_DASH)

/** The F43 row format: up to 4 decimals, trailing zeros trimmed
 *  (131,100,000 credits -> '0.0013'). */
export const displayDash = (credits: bigint | null | undefined): string => {
    const dash = creditsToDash(credits)
    if (dash === 0) return '0'
    return dash.toFixed(4).replace(/\.?0+$/, '')
}

interface EngineScanStatus {
    scanned: number
    alignedCount: number
    balance: string
    owned: number
}

/* --- Module-level singleton state (one engine per app, like the web) ---- */
const balanceCredits = ref<bigint | null>(null)
const scanStatus = ref<EngineScanStatus | null>(null)
const sendPhase = ref<string | null>(null)
const scanError = ref<string | null>(null)
const started = ref(false)
const startPromise = ref<Promise<boolean> | null>(null)
const startKey = ref<string | null>(null)
const engineAvailable = ref(true)
const historyRows = ref<ShieldedHistoryRow[]>([])

let handlersInstalled = false

const installHandlers = (): void => {
    if (handlersInstalled) return
    handlersInstalled = true
    shieldedEngine.onScanStatus((status) => {
        scanStatus.value = status
        balanceCredits.value = BigInt(status.balance)
    })
    shieldedEngine.onSendPhase((phase) => {
        sendPhase.value = phase
    })
}

/** Seed the balance from the persisted sync state (instant, before the
 *  first scan) — the F43 persistedShieldedBalance path. */
const seedPersistedBalance = (network: 'mainnet' | 'testnet'): void => {
    if (balanceCredits.value !== null) return
    const persisted = persistedShieldedBalance(network)
    if (persisted !== null) balanceCredits.value = persisted
}

/**
 * Idempotent, single-flight engine start. Resolves the session's network
 * + mnemonic (Rust keystore via load_mnemonic); WIF-only sessions (no
 * mnemonic) resolve FALSE — seed-derived features are unavailable, same
 * as desktop/mobile/web F55.
 */
export const ensureStarted = async (): Promise<boolean> => {
    installHandlers()
    installDesktopProverTransport()

    if (started.value) return true
    if (startPromise.value) return startPromise.value

    startPromise.value = (async (): Promise<boolean> => {
        try {
            const { ensure } = useNetwork()
            const network = await ensure()
            const mnemonic = await mnemonicManager.getMnemonic(network === 'mainnet' ? 'mainnet' : 'testnet')
            if (!mnemonic) {
                engineAvailable.value = false
                return false
            }
            const key = `${network}:${mnemonic}`
            if (startKey.value === key && started.value) return true
            /* Desktop session bridge: the ported lib reads the mnemonic via
             * secure-storage (localStorage 'mnemonic' — exactly where the
             * web app kept it). Prime it from the Rust keystore once per
             * session so the 1:1 library code resolves it synchronously;
             * the keystore stays the source of truth. */
            try { window.localStorage.setItem('mnemonic', mnemonic) } catch { /* private mode */ }
            seedPersistedBalance(network === 'mainnet' ? 'mainnet' : 'testnet')
            await shieldedEngine.start({ network: network === 'mainnet' ? 'mainnet' : 'testnet', mnemonic })
            startKey.value = key
            started.value = true
            return true
        } catch (error) {
            scanError.value = error instanceof Error ? error.message : String(error)
            engineAvailable.value = false
            return false
        } finally {
            startPromise.value = null
        }
    })()
    return startPromise.value
}

/** The bounded + retried note-tree scan (runs IN the worker; progress
 *  streams via scanStatus). */
export const runScan = async (): Promise<ShieldedSnapshot | null> => {
    if (!await ensureStarted()) return null
    try {
        scanError.value = null
        const snapshot = await shieldedEngine.runScan()
        balanceCredits.value = BigInt(snapshot.balance)
        return snapshot
    } catch (error) {
        scanError.value = error instanceof Error ? error.message : String(error)
        return null
    }
}

export const fetchHistory = async (): Promise<ShieldedHistoryRow[]> => {
    if (!await ensureStarted()) return []
    try {
        historyRows.value = await shieldedEngine.history()
        return historyRows.value
    } catch (error) {
        scanError.value = error instanceof Error ? error.message : String(error)
        return []
    }
}

export const sendShielded = async (params: {
    recipient: string
    amountCredits: bigint
    memoText?: string
}): Promise<ShieldedSendResult> => {
    if (!await ensureStarted()) throw new Error('The shielded engine is not available')
    return shieldedEngine.send({
        recipient: params.recipient,
        amountCredits: params.amountCredits.toString(),
        ...(params.memoText !== undefined ? { memoText: params.memoText } : {}),
    })
}

/** Post-broadcast settle poll (worker-side, up to 8 × 15s). */
export const settle = async (direction: 'below' | 'above', baseline: bigint): Promise<ShieldedSnapshot | null> => {
    if (!await ensureStarted()) return null
    const snapshot = await shieldedEngine.settle(direction, baseline.toString())
    balanceCredits.value = BigInt(snapshot.balance)
    return snapshot
}

export const receiveAddress = async (index: number): Promise<string | null> => {
    if (!await ensureStarted()) return null
    return shieldedEngine.receiveAddress(index)
}

export const poolExit = async (params: {
    kind: 'unshield' | 'topUpIdentity'
    outputAddress?: string
    identityId?: string
    netCredits: bigint
}): Promise<ShieldedSendResult & { netCredits: string }> => {
    if (!await ensureStarted()) throw new Error('The shielded engine is not available')
    return shieldedEngine.poolExit({
        kind: params.kind,
        ...(params.outputAddress !== undefined ? { outputAddress: params.outputAddress } : {}),
        ...(params.identityId !== undefined ? { identityId: params.identityId } : {}),
        netCredits: params.netCredits.toString(),
    })
}

/** Reactive handles (computed over the module singleton). */
export const useShieldedEngine = () => ({
    balanceCredits: computed(() => balanceCredits.value),
    balanceDash: computed(() => creditsToDash(balanceCredits.value)),
    displayBalance: computed(() => displayDash(balanceCredits.value)),
    scanStatus: computed(() => scanStatus.value),
    sendPhase: computed(() => sendPhase.value),
    scanError: computed(() => scanError.value),
    started: computed(() => started.value),
    engineAvailable: computed(() => engineAvailable.value),
    historyRows: computed(() => historyRows.value),
    ensureStarted,
    runScan,
    fetchHistory,
    sendShielded,
    settle,
    receiveAddress,
    poolExit,
})
