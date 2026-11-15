<!-- src/screens/wallet/Swap.vue -->
<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-surface-raise bg-surface-base">

        <!-- Navigation Header -->
        <header class="w-full max-w-5xl flex items-center justify-between px-6 py-6">
            <button
                @click="router.back()"
                class="flex items-center gap-2 px-4 py-2 rounded-control text-content-soft hover:text-content dark:hover:text-white hover:bg-surface-raise dark:hover:bg-surface-card transition-colors font-medium"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Wallet</span>
            </button>

            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raise bg-surface-card border border-edge">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-xs font-bold text-content uppercase tracking-wide">
                        {{ Wallet.network || 'testnet' }} · DashSwap
                    </span>
                </div>
            </div>
        </header>

        <div class="w-full max-w-xl px-6 pb-12 space-y-4">

            <!-- BOOTSTRAP NOTICE -->
            <section class="rounded-card border border-amber-200 bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
                <p class="text-xs text-amber-800 dark:text-amber-400 leading-relaxed">
                    <svg class="inline w-4 h-4 mr-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Bootstrap phase: swaps run <span class="font-semibold">one way only</span> —
                    you pay DASH and receive SANS or DUSD. Two-way swaps open after
                    the revenue phase.
                </p>
            </section>

            <!-- PAIR SELECTOR (the two allowed bootstrap destinations) -->
            <section class="grid grid-cols-2 gap-3">
                <button
                    v-for="(meta, key) in TOKEN_META"
                    :key="key"
                    @click="selectDestination(key as SwapDestination)"
                    class="flex flex-row items-center gap-2 px-3 py-3 border rounded-card shadow-sm transition-all cursor-pointer"
                    :class="destination === key
                        ? 'ring-2 ring-indigo-400 border-indigo-400 bg-surface-card'
                        : 'opacity-70 hover:opacity-100 bg-surface-card border-edge'"
                >
                    <span class="relative h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-surface-raise border border-edge shadow-sm">
                        <img :src="meta.icon" class="h-6 w-6" :alt="meta.name" />
                    </span>
                    <span class="flex flex-col items-start min-w-0">
                        <span class="text-sm font-semibold text-content whitespace-nowrap">{{ meta.name }}</span>
                        <span class="text-[10px] opacity-80 text-content-faint">{{ key === 'SANS' ? 'DASH → SANS' : 'DASH → DUSD' }}</span>
                    </span>
                </button>
            </section>

            <!-- SWAP CARD (Uniswap-style two-panel) -->
            <section class="rounded-card border border-edge bg-surface-card shadow-sm p-4 relative">
                <!-- FROM -->
                <div class="rounded-inner bg-surface-raise border border-edge p-3">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] text-content-faint font-medium uppercase tracking-wide">You pay</span>
                        <span class="text-[10px] text-content-faint">
                            {{ payable !== null
                                ? `Balance: ${formatAmount(payable / DUFFS_PER_DASH)} DASH available to swap`
                                : '—' }}
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <input
                            v-model="amount"
                            type="text"
                            inputmode="decimal"
                            placeholder="0.0"
                            autocomplete="off"
                            class="flex-1 min-w-0 bg-transparent text-2xl font-medium text-content focus:outline-none"
                        />
                        <span class="flex items-center gap-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 px-3 py-2">
                            <img src="/icons/dash.svg" class="h-5 w-5" alt="DASH" />
                            <span class="text-sm font-semibold text-indigo-900 dark:text-indigo-300">DASH</span>
                        </span>
                    </div>
                </div>

                <!-- FLIP (disabled during bootstrap — one-way swaps) -->
                <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <span
                        title="Bootstrap phase — one-way swaps (DASH → SANS / DASH → DUSD)"
                        class="flex h-9 w-9 items-center justify-center rounded-xl border border-edge bg-surface-card text-content-faint/40 shadow-sm cursor-not-allowed"
                    >
                        <svg class="h-4 w-4 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                    </span>
                </div>

                <!-- TO -->
                <div class="rounded-inner bg-surface-raise border border-edge p-3 mt-2">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] text-content-faint font-medium uppercase tracking-wide">You receive (estimated)</span>
                        <span class="text-[10px] text-content-faint">final rate fixes at settlement</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="flex-1 min-w-0 text-2xl font-medium text-content-faint truncate">
                            {{ estimatedReceiveDisplay }}
                        </span>
                        <span class="flex items-center gap-1.5 rounded-xl bg-surface-card border border-edge px-3 py-2">
                            <img :src="TOKEN_META[destination].icon" class="h-5 w-5" :alt="destination" />
                            <span class="text-sm font-semibold text-content">{{ TOKEN_META[destination].symbol }}</span>
                        </span>
                    </div>
                </div>
            </section>

            <p v-if="swapError" class="text-sm text-red-500 font-medium px-1">{{ swapError }}</p>

            <!-- SWAP BUTTON -->
            <button
                @click="handleSwap"
                :disabled="creating || amountDuffs() === null"
                class="w-full rounded-card bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-base font-semibold py-3 shadow transition-colors"
            >
                {{ creating ? 'Creating swap…' : `Swap DASH for ${TOKEN_META[destination].symbol}` }}
            </button>

            <!-- ACTIVE SWAP: deposit + tracker -->
            <section v-if="activeSwap" class="rounded-card border border-edge bg-surface-card shadow-sm p-4">
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-sm font-semibold text-content uppercase tracking-wide">Fund your swap</span>
                    <span class="text-[10px] font-mono text-content-faint">{{ activeSwap.swapid.slice(0, 18) }}…</span>
                </div>

                <div class="flex flex-col sm:flex-row items-center gap-4">
                    <div class="rounded-inner border border-edge bg-surface-card p-2 shadow-sm shrink-0">
                        <qrcode-vue
                            :value="activeSwap.deposit_address"
                            :size="128"
                            level="H"
                            render-as="svg"
                            background="#ffffff"
                            foreground="#0f172a"
                        />
                    </div>
                    <div class="flex-1 w-full space-y-2">
                        <p class="text-xs text-content-faint leading-relaxed">
                            Send <span class="font-semibold">
                                {{ activeSwap.amount_in != null ? `${formatAmount(activeSwap.amount_in / DUFFS_PER_DASH)} DASH` : 'the agreed DASH amount' }}
                            </span>
                            to the deposit address below (from your Deposit tab or any Dash
                            wallet). The DEX settles {{ TOKEN_META[destination].symbol }} to your
                            identity when the deposit confirms.
                        </p>
                        <button
                            @click="copyDeposit"
                            title="Click to copy"
                            class="w-full rounded-control border border-edge bg-surface-raise px-3 py-2 font-mono text-xs text-content break-all text-left hover:border-indigo-300 transition-colors"
                        >
                            {{ activeSwap.deposit_address }}
                        </button>
                        <div class="flex items-center gap-2">
                            <button
                                @click="copyDeposit"
                                class="rounded-control border border-edge bg-surface-raise px-3 py-1.5 text-xs text-content-soft hover:border-indigo-300 transition-colors flex items-center gap-1"
                            >
                                Copy
                            </button>
                            <span v-if="activeSwap.rate != null" class="text-[10px] text-content-faint">
                                Rate: 1 DASH ≈ {{ formatAmount(activeSwap.rate) }} {{ TOKEN_META[destination].symbol }}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="mt-3 pt-3 border-t border-edge flex items-center gap-2">
                    <span
                        class="w-4 h-4 rounded-full"
                        :class="isSettled(activeSwap.status) ? 'bg-emerald-500' : isFailed(activeSwap.status) ? 'bg-rose-500' : 'bg-indigo-500 animate-pulse'"
                    ></span>
                    <span class="text-xs text-content-faint">
                        <template v-if="isSettled(activeSwap.status)">
                            Settled{{ activeSwap.amount_out != null ? ` — you received ${formatAmount(activeSwap.amount_out / 1e8)} ${TOKEN_META[destination].symbol}` : '' }}
                        </template>
                        <template v-else-if="isFailed(activeSwap.status)">
                            Swap {{ activeSwap.status }} — contact support with id {{ activeSwap.swapid.slice(0, 18) }}…
                        </template>
                        <template v-else>
                            Status: {{ activeSwap.status }} — waiting for your deposit (checking every 10s)
                        </template>
                    </span>
                </div>
            </section>

            <!-- LOCAL SWAP HISTORY -->
            <section v-if="historyList.length > 0" class="rounded-card border border-edge bg-surface-card shadow-sm overflow-hidden">
                <div class="flex items-center gap-2 px-4 py-3 border-b border-edge">
                    <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span class="text-sm font-semibold text-content">Your swaps</span>
                </div>
                <div class="divide-y divide-edge">
                    <div
                        v-for="swap in historyList"
                        :key="swap.swapid"
                        class="px-4 py-3 flex items-center gap-3"
                    >
                        <span
                            class="shrink-0 w-3.5 h-3.5 rounded-full border-2"
                            :class="isSettled(swap.status) ? 'border-emerald-500 bg-emerald-500/20' : isFailed(swap.status) ? 'border-rose-500 bg-rose-500/20' : 'border-indigo-500 bg-indigo-500/20'"
                        ></span>
                        <div class="min-w-0 flex-1">
                            <p class="text-xs font-semibold text-content">
                                DASH → {{ swap.direction.includes('SANS') ? 'SANS' : 'DUSD' }}
                                <span class="ml-2 text-[10px] font-mono text-content-faint">{{ swap.swapid.slice(0, 14) }}…</span>
                            </p>
                            <p class="text-[10px] text-content-faint">
                                {{ swap.amount_in != null ? `${formatAmount(swap.amount_in / DUFFS_PER_DASH)} DASH in` : 'open amount' }}{{ swap.amount_out != null && ` → ${formatAmount(swap.amount_out / 1e8)} ${swap.direction.includes('SANS') ? 'SANS' : 'DUSD'}` }}
                            </p>
                        </div>
                        <span
                            class="text-[10px] uppercase shrink-0 font-bold"
                            :class="isSettled(swap.status) ? 'text-emerald-600 dark:text-emerald-400' : isFailed(swap.status) ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'"
                        >
                            {{ swap.status }}
                        </span>
                    </div>
                </div>
            </section>

            <p class="text-[10px] text-content-faint px-1">
                Rates are indicative (quoted from the DashSwap tickers) and fix at
                settlement. Powered by DashSwap — dashswap.xyz.
            </p>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import QrcodeVue from 'qrcode.vue'
import { useWalletStore } from '@/stores/wallet'
import { useIdentityStore } from '@/stores/identity'
import { useNetwork } from '@/composables/useNetwork'
import { useShieldedEngine } from '@/composables/useShieldedEngine'
import * as coreChain from '@/lib/core-chain'

/* Desktop routing note: the browser wallet calls the SAME-ORIGIN Pages
 * Function (/api/dashswap — the API key lives server-side). The desktop
 * webview cannot hold the key either, so it rides the SAME deployed
 * key-holding proxy on https://evonext.app (CSP already allows https:). */
const DASHSWAP_PROXY_BASE = 'https://evonext.app/api/dashswap'

const DUFFS_PER_DASH = 1e8

type Network = 'mainnet' | 'testnet'
type SwapDestination = 'SANS' | 'DUSD'
type SwapDirection = 'DASH->SANS' | 'DASH->DUSD'

interface DashswapSwap {
    swapid: string
    direction: string
    platformid: string
    deposit_address: string
    bip44_index?: number
    amount_in?: number | null
    amount_out?: number | null
    rate?: number | null
    expected_out?: number | null
    status: string
    created_at: number
    updated_at?: number
}

const isSettled = (status: string) => /settled|complete|completed|done/i.test(status)
const isFailed = (status: string) => /fail|reject|cancel|expire|refund/i.test(status)

const swapListKey = (network: Network) => `evonext_swaps_${network}`
const loadSwapIds = (network: Network): string[] => {
    try {
        const raw = window.localStorage.getItem(swapListKey(network))
        const parsed = raw ? JSON.parse(raw) : []
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}
const rememberSwapId = (network: Network, swapid: string) => {
    try {
        const ids = loadSwapIds(network)
        if (!ids.includes(swapid)) {
            const next = [swapid, ...ids].slice(0, 25)
            window.localStorage.setItem(swapListKey(network), JSON.stringify(next))
        }
    } catch { /* private mode */ }
}

/* The token metadata for the destination chips (desktop uses the bundled
 * dusd.svg mark for USD — the web's dedicated usd.svg is a web asset). */
const TOKEN_META: Record<SwapDestination, { name: string; symbol: string; icon: string }> = {
    SANS: { name: 'Sansnote', symbol: 'SANS', icon: '/icons/sans.svg' },
    DUSD: { name: 'USD', symbol: 'DUSD', icon: '/icons/dusd.svg' },
}

/* numeral is a web dep — the desktop formats with Intl to the same
 * '0,0.00[000000]' shape (up to 6 decimals, trailing zeros trimmed). */
const formatAmount = (value: number): string => {
    const rounded = Math.round(value * 1e8) / 1e8
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(rounded)
}

const router = useRouter()
const Wallet = useWalletStore()
const Identity = useIdentityStore()
const { ensure } = useNetwork()
const engine = useShieldedEngine()

const sdkNetwork = computed<Network>(() => Wallet.network === 'mainnet' ? 'mainnet' : 'testnet')

const destination = ref<SwapDestination>('DUSD')
const amount = ref('')
const payable = ref<number | null>(null)
const activeSwap = ref<DashswapSwap | null>(null)
const creating = ref(false)
const swapError = ref<string | null>(null)
const history = ref<Record<string, DashswapSwap>>({})

const historyList = computed(() =>
    Object.values(history.value).sort((a, b) => (b.updated_at ?? b.created_at) - (a.updated_at ?? a.created_at)))

const estimatedReceiveDisplay = computed(() => {
    const duffs = amountDuffs()
    if (activeSwap.value?.rate != null && duffs !== null) {
        return formatAmount(duffs / DUFFS_PER_DASH * activeSwap.value.rate)
    }
    return '0.0'
})

const selectDestination = (key: SwapDestination) => {
    destination.value = key
    if (activeSwap.value && !isSettled(activeSwap.value.status) && !isFailed(activeSwap.value.status)) return
    activeSwap.value = null
}

/** The funding wallet's spendable balance — the pool this swap pays
 *  from (an operational context line for the swap form ONLY; per the
 *  owner directive there is NO Core-balance row in the asset list). */
const refreshPayable = async () => {
    try {
        const network = await ensure()
        const mnemonic = await engine.ensureStarted() ? window.localStorage.getItem('mnemonic') : null
        if (!mnemonic) {
            payable.value = null
            return
        }
        // Prime the session bridge for the sync lib call.
        try { window.localStorage.setItem('mnemonic', mnemonic) } catch { /* private mode */ }
        const funding = coreChain.deriveFundingKey(network, Identity.identityIdx || 0)
        const utxos: any[] = await coreChain.getFundingUtxos(network, funding.address)
        payable.value = utxos.reduce((sum: number, u: any) => sum + u.satoshis, 0)
    } catch {
        payable.value = null
    }
}

/** Fetch one swap's status through the key-holding proxy. */
const fetchSwap = async (swapid: string): Promise<DashswapSwap | null> => {
    try {
        const res = await fetch(`${DASHSWAP_PROXY_BASE}/swap/${encodeURIComponent(swapid)}`)
        if (!res.ok) return null
        const body = await res.json()
        return body?.swap ?? null
    } catch {
        return null
    }
}

const refreshHistory = async () => {
    const ids = loadSwapIds(sdkNetwork.value)
    if (ids.length === 0) {
        history.value = {}
        return
    }
    const entries = await Promise.all(ids.map(async (id) => [id, await fetchSwap(id)] as const))
    const next: Record<string, DashswapSwap> = {}
    for (const [id, swap] of entries) {
        if (swap) next[id] = swap
    }
    history.value = next
}

let pollTimer: ReturnType<typeof setInterval> | null = null
const stopPolling = () => {
    if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
    }
}

/* Poll the ACTIVE swap until it settles (10s cadence). */
watch(() => activeSwap.value?.swapid, (swapid) => {
    stopPolling()
    if (!swapid) return
    pollTimer = setInterval(async () => {
        const swap = await fetchSwap(swapid)
        if (!swap) return
        activeSwap.value = swap
        history.value = { ...history.value, [swap.swapid]: swap }
        if (isSettled(swap.status) || isFailed(swap.status)) stopPolling()
    }, 10000)
})

const amountDuffs = (): number | null => {
    const trimmed = amount.value.trim()
    if (!/^\d+(\.\d{0,8})?$/.test(trimmed)) return null
    const value = Number(trimmed)
    if (!(value > 0)) return null
    return Math.round(value * DUFFS_PER_DASH)
}

const handleSwap = async () => {
    swapError.value = null
    const amountIn = amountDuffs()
    if (amountIn === null) {
        swapError.value = 'Please enter a valid DASH amount to swap.'
        return
    }
    if (!Identity.identityId) {
        swapError.value = 'Your session is still loading — try again in a moment.'
        return
    }
    if (payable.value !== null && amountIn > payable.value) {
        swapError.value = `The amount exceeds the funds available to swap (${formatAmount((payable.value ?? 0) / DUFFS_PER_DASH)} DASH).`
        return
    }

    creating.value = true
    try {
        const direction: SwapDirection = destination.value === 'SANS' ? 'DASH->SANS' : 'DASH->DUSD'
        const res = await fetch(`${DASHSWAP_PROXY_BASE}/swap`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                direction,
                platformid: Identity.identityId,
                /* Bootstrap v1: the swap credits land on THIS identity. */
                dest_platformid: Identity.identityId,
                amount_in: amountIn,
            }),
        })
        const body = await res.json()
        if (!res.ok || !body?.swap) {
            swapError.value = body?.error || `The swap request failed (HTTP ${res.status}).`
            return
        }
        const swap: DashswapSwap = body.swap
        activeSwap.value = swap
        rememberSwapId(sdkNetwork.value, swap.swapid)
        history.value = { ...history.value, [swap.swapid]: swap }
        amount.value = ''
    } catch (error: any) {
        swapError.value = error?.message || 'The swap request failed.'
    } finally {
        creating.value = false
    }
}

const copyDeposit = async () => {
    if (!activeSwap.value?.deposit_address) return
    try {
        await navigator.clipboard.writeText(activeSwap.value.deposit_address)
    } catch {
        swapError.value = 'Failed to copy the address'
    }
}

onMounted(() => {
    void refreshPayable()
    void refreshHistory()
})

onUnmounted(stopPolling)

watch(sdkNetwork, () => {
    stopPolling()
    activeSwap.value = null
    void refreshPayable()
    void refreshHistory()
})
</script>
