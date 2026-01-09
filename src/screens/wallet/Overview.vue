<!-- src/screens/wallet/Overview.vue -->
<script setup lang="ts">
/* Import modules. */
import { onMounted, computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useWalletStore } from '@/stores/wallet'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { useNetwork } from '@/composables/useNetwork'

const router = useRouter()
const Wallet = useWalletStore()
const Identity = useIdentityStore()
const System = useSystemStore()
const { ensure } = useNetwork()

// --- Debug Toggle State ---
const isDebugOpen = ref(false)

// --- Pagination State (Recent Activity) ---
const currentPage = ref(1)
const txPageSize = 5

const totalPages = computed(() => {
    return Math.ceil(Wallet.transactions.length / txPageSize)
})

const displayedTransactions = computed(() => {
    const start = (currentPage.value - 1) * txPageSize
    const end = start + txPageSize
    return Wallet.transactions.slice(start, end)
})

const nextPage = () => {
    if (currentPage.value < totalPages.value) {
        currentPage.value++
    }
}

const previousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--
    }
}

// Helper to format CREDITS to DASH equivalent
const formatDashFromCredits = (creditsString: string | number) => {
    const credits = parseInt(String(creditsString), 10)
    // 1 Credit = 100,000,000,000 Duffs (Dash Satoshis)
    const duffs = credits / 1000
    const dash = duffs / 100000000
    return dash || 0
}

const totalBalance = computed(() => {
    // Check if Identity has balance
    if (Identity.isConnected && Identity.balance) {
        const dash = formatDashFromCredits(Identity.balance)
        const usd = dash * (System.currentDashPrice || 0)

        return { dash, usd }
    }
    // Fallback to wallet store assets
    const dashBalance = Number(Wallet.assets.find(a => a.symbol === 'DASH')?.balance) || 0
    return {
        dash: dashBalance,
        usd: dashBalance * (System.currentDashPrice || 0)
    }
})

const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '$0.00'
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value)
}

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'Completed': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        case 'Pending...': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse'
        case 'Failed': return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        default: return 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
    }
}

const getIconSrc = (symbol: string) => {
    const lower = symbol.toLowerCase()
    if (lower === 'credits') {
        return '/icons/dash.svg'
    }
    return `/icons/${lower}.svg`
}

const assetIconExists = (symbol: string) => {
    const lower = symbol.toLowerCase()
    const commonIcons = ['dash', 'sans', 'dusd']
    return commonIcons.includes(lower) || lower === 'credits'
}

const forceRefresh = async () => {
    currentPage.value = 1 // Reset to page 1 on refresh
    await Wallet.refreshBalances()
}

onMounted(async () => {
    await nextTick()

    /* 1. Ensure Network Settings are Loaded */
    const currentNetwork = await ensure()
    console.log(`🌐 Network initialized: ${currentNetwork}`)

    /* 2. Validate market data using existing System Store methods */
    if (!System.currentDashPrice) {
        await System.fetchDashPrice()
    }

    /* 3. Validate identity connection. */
    if (Identity.isConnected) {
        console.log('✅ Identity connected, using identity data for user:', Identity.username)
        const realIdentityId = Identity.identityId
        /* Validate real identity ID. */
        if (realIdentityId) {
            Wallet.user = {
                username: Identity.username || 'Unknown',
                displayName: Identity.username || 'Unknown',
                name: Identity.username || '',
                address: realIdentityId,
                avatar: '',
                identityId: realIdentityId
            }
            console.log('✅ Setting wallet user with real identity ID:', realIdentityId)
        }
    }

    /* 4. Refresh Balances */
    await Wallet.refreshBalances(currentNetwork)
})
</script>

<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-slate-50 dark:bg-slate-950 pb-12">

        <!-- Navigation Header -->
        <header class="w-full max-w-5xl flex items-center justify-between px-6 py-6">
            <div class="flex items-center gap-3">
                <div class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                </div>
                <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
                    Wallet Dashboard
                </h1>
            </div>

            <div class="flex items-center gap-4">
                <button @click="forceRefresh" class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" title="Refresh">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>

                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                        {{ Wallet.network || 'testnet' }}
                    </span>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <div class="w-full max-w-5xl px-6 space-y-6">

            <!-- Top Row: Balance & Collectibles -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

                <!-- Balance Card (Span 2) -->
                <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col justify-between relative overflow-hidden">
                    <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div class="relative z-10">
                        <div class="flex justify-between items-start mb-4">
                            <p class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Total Balance
                            </p>

                            <!-- Price Display -->
                            <div class="text-right">
                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Market Price</div>
                                <div class="flex items-center justify-end gap-1.5 font-mono text-sm">
                                    <span class="font-bold text-slate-700 dark:text-slate-300">
                                        ${{ System.currentDashPrice?.toFixed(2) || '0.00' }}
                                    </span>
                                    <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md" :class="System.isPricePositive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'">
                                        <svg class="w-3 h-3" :class="System.isPricePositive ? '' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span class="text-[10px] font-bold">
                                            {{ System.priceChange24h > 0 ? '+' : '' }}{{ System.priceChange24h.toFixed(2) }}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-baseline gap-3 mb-2">
                            <span class="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                {{ formatCurrency(totalBalance.usd) }}
                            </span>
                        </div>

                        <p class="text-xl font-medium text-slate-500 dark:text-slate-400 mb-8">
                            {{ totalBalance.dash.toLocaleString(undefined, { maximumFractionDigits: 6 }) }} DASH
                        </p>

                        <!-- Action Buttons -->
                        <div class="grid grid-cols-3 gap-3">
                            <button @click="router.push('/wallet/deposit')" class="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-emerald-500/30 hover:shadow-lg transition-all group">
                                <svg class="w-6 h-6 text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                                </svg>
                                <span class="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Deposit</span>
                            </button>
                            <button @click="router.push('/wallet/send')" class="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-500/30 hover:shadow-lg transition-all group">
                                <svg class="w-6 h-6 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span class="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Send</span>
                            </button>
                            <button @click="router.push('/wallet/swap')" class="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-amber-500/30 hover:shadow-lg transition-all group">
                                <svg class="w-6 h-6 text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                                <span class="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-amber-700 dark:group-hover:text-amber-300">Swap</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Collectibles Card (Span 1) -->
                <div class="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-black rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                    <div class="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/20 shadow-lg">
                        <svg class="w-8 h-8 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-2">Collectibles</h3>
                    <p class="text-sm text-slate-400 mb-6 font-medium">Unique digital assets</p>
                    <button class="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-all backdrop-blur-md text-sm">
                        Coming Soon
                    </button>
                </div>
            </div>

            <!-- Middle Row: Assets & Transactions -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">

                <!-- Assets List -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col h-full">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            My Assets
                        </h2>
                        <span v-if="Wallet.isLoading" class="text-xs font-bold text-amber-500 uppercase tracking-wide animate-pulse">Loading...</span>
                    </div>

                    <div class="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        <div
                            v-for="asset in Wallet.assets"
                            :key="asset.id"
                            role="button"
                            @click="router.push(`/wallet/asset/${asset.symbol}`)"
                            class="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                        >
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                    <img
                                        v-if="assetIconExists(asset.symbol.toLowerCase())"
                                        :src="getIconSrc(asset.symbol)"
                                        :alt="asset.symbol"
                                        class="w-8 h-8"
                                    />
                                    <svg v-else class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ asset.name }}</p>
                                    <p class="text-xs font-mono text-slate-500 dark:text-slate-400">{{ asset.symbol }}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-slate-900 dark:text-white">{{ asset.balance?.toLocaleString() }}</p>
                                <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatCurrency(asset.usdValue as number) }}</p>
                            </div>
                        </div>

                        <div v-if="Wallet.assets.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-400">
                            <svg class="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                            <p class="text-sm font-medium">No assets found</p>
                        </div>
                    </div>
                </div>

                <!-- Recent Transactions (Paginated) -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-0 flex flex-col h-full">

                    <!-- Header -->
                    <div class="p-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex justify-between items-center">
                            <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Recent Activity
                            </h2>
                            <div class="text-xs font-bold text-slate-500 dark:text-slate-400">
                                Page <span class="text-indigo-600 dark:text-indigo-400">{{ currentPage }}</span> of {{ totalPages }}
                            </div>
                        </div>
                    </div>

                    <!-- Transactions List -->
                    <div class="flex-1 overflow-y-auto custom-scrollbar p-8 pt-4 space-y-3">
                        <div
                            v-for="tx in displayedTransactions"
                            :key="tx.id"
                            role="button"
                            @click="router.push(`/wallet/transaction/${tx.id}`)"
                            class="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer group"
                        >
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                                    <svg v-if="tx.type === 'sent'" class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    <svg v-if="tx.type === 'received'" class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                    <svg v-if="tx.type === 'swap'" class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <div class="min-w-0">
                                    <p class="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ tx.title }}</p>
                                    <p class="text-xs font-mono text-slate-500 dark:text-slate-400 truncate">{{ tx.subtitle }}</p>
                                </div>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <span class="font-bold text-slate-900 dark:text-white">{{ tx.amount }}</span>
                                <span class="px-2 py-0.5 rounded text-[10px] font-bold" :class="getStatusClasses(tx.status)">
                                    {{ tx.status }}
                                </span>
                            </div>
                        </div>

                        <div v-if="displayedTransactions.length === 0 && !Wallet.isLoading" class="flex flex-col items-center justify-center h-full min-h-[200px] text-slate-400">
                            <svg class="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p class="text-sm font-medium">No recent activity</p>
                        </div>
                    </div>

                    <!-- Pagination Controls -->
                    <div v-if="totalPages > 1" class="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <button
                            @click="previousPage"
                            :disabled="currentPage === 1"
                            class="flex-1 py-2 px-4 mr-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
                            Previous
                        </button>

                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 mx-2">
                            {{ displayedTransactions.length }} / {{ Wallet.transactions.length }}
                        </span>

                        <button
                            @click="nextPage"
                            :disabled="currentPage === totalPages"
                            class="flex-1 py-2 px-4 ml-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            Next
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>

            <!-- DEBUG SECTION -->
            <div class="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
                <div class="p-4 border-b border-slate-700 flex justify-between items-center cursor-pointer hover:bg-slate-800 transition-colors" @click="isDebugOpen = !isDebugOpen">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        <h3 class="text-sm font-bold text-red-400 uppercase tracking-widest">Debug Information</h3>
                    </div>
                    <svg class="w-4 h-4 text-slate-400 transition-transform duration-300" :class="{ 'rotate-180': isDebugOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                <div v-if="isDebugOpen" class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
                    <div class="bg-black/50 p-4 rounded border border-slate-700">
                        <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">Identity Store State</p>
                        <ul class="space-y-1 text-slate-400">
                            <li class="flex justify-between"><span class="opacity-70">Is Connected:</span> <span class="text-emerald-400">{{ Identity.isConnected }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Username:</span> <span class="text-white">{{ Identity.username }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Identity ID:</span> <span class="text-white text-right truncate max-w-[150px]">{{ Identity.identityId }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Balance (Raw):</span> <span class="text-white">{{ Identity.balance }}</span></li>
                        </ul>
                    </div>

                    <div class="bg-black/50 p-4 rounded border border-slate-700">
                        <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">Wallet Store State</p>
                        <ul class="space-y-1 text-slate-400">
                            <li class="flex justify-between"><span class="opacity-70">Active Network:</span> <span class="text-white">{{ Wallet.network }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Assets Count:</span> <span class="text-white">{{ Wallet.assets.length }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Is Loading:</span> <span class="text-amber-400">{{ Wallet.isLoading }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Total Tx Count:</span> <span class="text-white">{{ Wallet.transactions.length }}</span></li>
                            <li class="flex justify-between"><span class="opacity-70">Current Page:</span> <span class="text-emerald-400">{{ currentPage }}</span></li>
                        </ul>
                    </div>

                    <div class="col-span-1 md:col-span-2 bg-black/50 p-4 rounded border border-slate-700 overflow-x-auto">
                        <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">First Asset (Raw JSON)</p>
                        <pre class="text-slate-400">{{ JSON.stringify(Wallet.assets[0], null, 2) }}</pre>
                    </div>

                    <div class="bg-black/50 p-4 rounded border border-slate-700">
                        <p class="font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1">Asset Fetch Status</p>
                        <ul class="space-y-1 text-slate-400">
                            <li class="flex justify-between">
                                <span class="opacity-70">Assets Count:</span>
                                <span class="text-white">{{ Wallet.assets.length }}</span>
                            </li>
                            <li class="flex justify-between">
                                <span class="opacity-70">Has DUSD/SANS:</span>
                                <span class="text-white">{{
                                    Wallet.assets.filter(a => a.symbol === 'DUSD' || a.symbol === 'SANS').length > 0 ? 'YES' : 'NO'
                                }}</span>
                            </li>
                            <li class="flex justify-between">
                                <span class="opacity-70">Last Asset Fetch:</span>
                                <span class="text-white" id="asset-fetch-status">Not Attempted</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    </main>
</template>
