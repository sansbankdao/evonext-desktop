<!-- scr/screens/wallet/Overview.vuew -->
<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-surface-raise bg-surface-base pb-12">
        <Header title="Wallet" />

        <!-- 1. Header -->
        <WalletHeader
            :network="Wallet.network"
            :is-refreshing="isRefreshing"
            @refresh="forceRefresh"
        />

        <div class="w-full max-w-5xl px-6 space-y-6">
            <!-- 2. TOTAL Balance: identity + Transparent + Shielded (F50a) -->
            <BalanceCard
                :balance="totalBalance"
                :price="System.currentDashPrice || 0"
                :price-change="System.priceChange24h"
            />

            <!-- 2b. The three-pool breakdown (F50a): Identity / Transparent / Shielded -->
            <div class="grid grid-cols-3 gap-4">
                <div class="bg-surface-card rounded-card border border-edge shadow-sm p-5 text-center">
                    <p class="text-xs font-bold uppercase tracking-wide text-content-faint">Identity</p>
                    <p class="text-lg font-bold text-content mt-1 font-mono">{{ identityDashDisplay }}</p>
                    <p class="text-xs text-content-faint">{{ formatCurrency(identityCreditsUsd) }}</p>
                </div>
                <div class="bg-surface-card rounded-card border border-edge shadow-sm p-5 text-center">
                    <p class="text-xs font-bold uppercase tracking-wide text-content-faint">Transparent</p>
                    <p class="text-lg font-bold text-content mt-1 font-mono">{{ transparentDashDisplay }}</p>
                    <p class="text-xs text-content-faint">{{ formatCurrency(transparentUsd) }}</p>
                </div>
                <button
                    class="bg-surface-card rounded-card border border-edge shadow-sm p-5 text-center hover:border-indigo-500/40 transition-colors cursor-pointer"
                    @click="router.push('/wallet/shielded')"
                >
                    <p class="text-xs font-bold uppercase tracking-wide text-content-faint flex items-center justify-center gap-1">
                        Shielded
                        <svg v-if="isScanning" class="w-3 h-3 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                    </p>
                    <p class="text-lg font-bold text-content mt-1 font-mono">{{ shieldedDashDisplay }}</p>
                    <p class="text-xs text-content-faint">{{ formatCurrency(shieldedUsd) }}</p>
                </button>
            </div>

            <!-- 3. Collectibles Row -->
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-black rounded-card border border-edge shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group">
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                <div class="flex items-center gap-4 relative z-10">
                    <div class="w-12 h-12 bg-surface-card/10 backdrop-blur-md rounded-inner flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/20 shadow-lg">
                        <svg class="w-6 h-6 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div class="text-left">
                        <h3 class="text-lg font-bold text-white">Collectibles</h3>
                        <p class="text-sm text-content-faint font-medium">Unique digital assets</p>
                    </div>
                </div>
                <button class="relative z-10 px-6 py-2 bg-surface-card/10 hover:bg-surface-card/20 border border-white/20 text-white font-bold rounded-control transition-all backdrop-blur-md text-sm">
                    Coming Soon
                </button>
            </div>

            <!-- 4. Middle Row: Assets & Transactions -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[600px]">
                <AssetList
                    :assets="liveAssets"
                    :is-loading="Wallet.isLoading || isRefreshing"
                />

                <TransactionHistory
                    :transactions="Wallet.transactions"
                    :is-loading="Wallet.isLoading"
                />
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { useWallet } from '@/composables/useWallet'
import { useNetwork } from '@/composables/useNetwork'
import { useShieldedEngine, displayDash } from '@/composables/useShieldedEngine'

// Components
import Header from '@/components/Header.vue'
import WalletHeader from '@/components/wallet/WalletHeader.vue'
import BalanceCard from '@/components/wallet/BalanceCard.vue'
import AssetList from '@/components/wallet/AssetList.vue'
import TransactionHistory from '@/components/wallet/TransactionHistory.vue'

const Wallet = useWalletStore()
const Identity = useIdentityStore()
const System = useSystemStore()
const wallet = useWallet()
const engine = useShieldedEngine()
const { ensure } = useNetwork()
const router = useRouter()

const isRefreshing = ref(false)
const isScanning = ref(false)

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)

/* --- The three pools (F50a) — credits are converted at EXACTLY ONE
       boundary (displayDash / the 1e11 constant) -------------------------- */

const identityCredits = computed(() => {
    // balanceBigInt is RAW identity credits (credits/1e11 happens HERE —
    // the old code divided dashBigInt by 1e8 AGAIN: the double-conversion
    // defect the mobile handoff §6 documents).
    return Identity.balanceBigInt ?? 0n
})

const transparentRow = computed(() => Wallet.assets.find(a => a.id === 'transparent'))
const shieldedRow = computed(() => Wallet.assets.find(a => a.id === 'shielded'))

const transparentCredits = computed(() => {
    const raw = transparentRow.value?.balance
    const parsed = raw === undefined || raw === null ? '0' : String(raw)
    try { return BigInt(parsed) } catch { return 0n }
})

/* The Shielded pool: the LIVE engine balance (instant-seeded from the
 * persisted sync state, refined by scan progress); falls back to the
 * store's row seed while the engine has no value yet. */
const shieldedCredits = computed(() =>
    engine.balanceCredits.value ?? BigInt(String(shieldedRow.value?.balance ?? '0')))

const totalCredits = computed(() =>
    identityCredits.value + transparentCredits.value + shieldedCredits.value)

const totalBalance = computed(() => {
    const dash = Number(totalCredits.value) / 100_000_000_000
    return { dash, usd: dash * (System.currentDashPrice || 0) }
})

const identityDashDisplay = computed(() => displayDash(identityCredits.value))
const transparentDashDisplay = computed(() => displayDash(transparentCredits.value))
const shieldedDashDisplay = computed(() => displayDash(shieldedCredits.value))

const identityCreditsUsd = computed(() =>
    (Number(identityCredits.value) / 100_000_000_000) * (System.currentDashPrice || 0))
const transparentUsd = computed(() =>
    (Number(transparentCredits.value) / 100_000_000_000) * (System.currentDashPrice || 0))
const shieldedUsd = computed(() =>
    (Number(shieldedCredits.value) / 100_000_000_000) * (System.currentDashPrice || 0))

/* The AssetList gets the store rows with the LIVE shielded balance
 * overlaid on the Shielded row (the scan refines the persisted seed). */
const liveAssets = computed(() => {
    if (engine.balanceCredits.value === null) return Wallet.assets
    return Wallet.assets.map(a => a.id === 'shielded'
        ? {
            ...a,
            balance: engine.balanceCredits.value!.toString(),
            balanceFormatted: displayDash(engine.balanceCredits.value),
            usdValue: (Number(engine.balanceCredits.value) / 100_000_000_000) * (System.currentDashPrice || 0),
        }
        : a)
})

const forceRefresh = async () => {
    if (isRefreshing.value) return
    isRefreshing.value = true
    try {
        const currentNetwork = await ensure()
        if (Identity.isConnected) await Identity.fetchBalance()
        await Wallet.refreshBalances(currentNetwork)
        await System.fetchDashPrice()
        // The shielded scan refines the pool balance (resumable, in the worker).
        void rescanShielded()
    } finally {
        isRefreshing.value = false
    }
}

const rescanShielded = async () => {
    if (isScanning.value) return
    isScanning.value = true
    try {
        await engine.runScan()
        await engine.fetchHistory()
    } finally {
        isScanning.value = false
    }
}

onMounted(async () => {
    await nextTick()
    const currentNetwork = await ensure()
    if (!System.currentDashPrice) System.fetchDashPrice()

    if (Identity.isConnected && Identity.identityId) {
        await Identity.fetchBalance()
        await Wallet.refreshBalances(currentNetwork)
    }
    wallet.startPolling(45000)

    // Engine start is single-flight + idempotent; the scan runs once.
    const available = await engine.ensureStarted()
    if (available) void rescanShielded()
})
</script>
