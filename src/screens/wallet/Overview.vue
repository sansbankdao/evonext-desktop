<!-- src/screens/wallet/Overview.vue -->
<template>
    <main>
        <Header title="Wallet Dashboard" />

        <!-- Balance Card & Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 group">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex-1">
                        <p class="text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wide font-bold mb-3">
                            Total Balance
                        </p>

                        <p class="text-5xl font-black bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-2">
                            {{ formatCurrency(totalBalance.usd) }}
                        </p>
                        <p class="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2 font-mono">
                            {{ totalBalance.dash.toLocaleString(undefined, { maximumFractionDigits: 6 }) }} DASH
                        </p>
                        <p class="text-lg text-slate-600 dark:text-slate-400 font-mono">
                            {{ totalBalance.credits.toLocaleString() }} credits
                        </p>

                        <div class="mt-4 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-2 rounded-xl">
                            <svg class="w-5 h-5" :class="System.isPricePositive ? 'text-emerald-500' : 'text-red-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path v-show="System.isPricePositive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4 10-10" />
                                <path v-show="!System.isPricePositive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l-4 4-10 10" />
                            </svg>
                            <span class="text-lg font-bold" :class="System.isPricePositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'">
                                {{ System.priceChange24h > 0 ? '+' : '' }}{{ System.priceChange24h.toFixed(2) }}% vs last 24h
                            </span>
                        </div>
                    </div>

                    <div class="flex-shrink-0 flex items-center gap-2 bg-indigo-500/10 dark:bg-indigo-900/20 px-4 py-3 rounded-2xl text-sm border-2 border-indigo-200/50 dark:border-indigo-800/50 shadow-sm">
                        <svg class="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span class="font-bold text-indigo-700 dark:text-indigo-300">
                            Dash Platform
                        </span>
                    </div>
                </div>

                <div class="flex flex-col sm:flex-row gap-4">
                    <button @click="router.push('/wallet/deposit')" class="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 focus:ring-4 focus:ring-emerald-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Deposit</span>
                    </button>

                    <button @click="router.push('/wallet/send')" class="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 focus:ring-4 focus:ring-indigo-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Send</span>
                    </button>

                    <button @click="router.push('/wallet/swap')" class="flex-1 flex items-center justify-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold py-4 px-6 rounded-2xl hover:from-amber-600 hover:to-amber-700 transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-1 focus:ring-4 focus:ring-amber-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Swap</span>
                    </button>
                </div>
            </div>

            <!-- Collectibles -->
            <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 flex flex-col justify-center items-center text-center hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 group">
                <div class="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 shadow-lg border-2 border-indigo-200/50 dark:border-indigo-800/50">
                    <svg class="w-8 h-8 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>
                <p class="text-3xl font-black text-slate-900 dark:text-slate-100 mb-2">
                    Collectibles
                </p>

                <p class="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold mb-6">
                    Unique digital assets
                </p>

                <button class="px-8 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-600 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-1 text-lg tracking-wide">
                    Coming Soon
                </button>
            </div>
        </div>

        <!-- Assets & Transactions -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <!-- Assets List -->
            <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 group">
                <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8 flex items-center gap-3">
                    <svg class="w-7 h-7 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    My Assets
                </h2>

                <div class="space-y-4">
                    <div
                        v-for="asset in Wallet.assets"
                        :key="asset.ticker"
                        role="button"
                        tabindex="0"
                        @click="router.push(`/wallet/asset/${asset.ticker}`)"
                        @keydown.enter="router.push(`/wallet/asset/${asset.ticker}`)"
                        class="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-2xl transition-all duration-300 ease-in-out border-2 border-slate-200/50 dark:border-slate-600 hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-500 cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 shadow-sm group"
                    >
                        <div class="flex items-center gap-4">
                            <div class="relative size-14 bg-white/80 dark:bg-slate-800/80 rounded-2xl p-3 flex items-center justify-center border-2 border-slate-200/50 dark:border-slate-600/50 group-hover:scale-105 group-hover:shadow-lg transition-all duration-300 shadow-md">
                                <img
                                    v-if="assetIconExists(asset.ticker.toLowerCase())"
                                    :src="getIconSrc(asset.ticker)"
                                    :alt="asset.ticker"
                                    class="size-9"
                                />
                                <svg v-else class="size-8 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div class="group">
                                <p class="font-black text-xl text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200">{{ asset.name }}</p>
                                <p class="text-base text-slate-600 dark:text-slate-400 font-mono font-bold tracking-wide">{{ asset.ticker }}</p>
                            </div>
                        </div>
                        <div class="text-right space-y-1">
                            <p class="font-black text-2xl text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200">{{ asset.amount.toLocaleString() }} {{ asset.ticker }}</p>
                            <p class="text-lg text-slate-600 dark:text-slate-400 font-bold">{{ formatCurrency(asset.usdValue) }}</p>
                        </div>
                    </div>
                </div>
                <div v-if="Wallet.assets.length === 0" class="text-center py-12 text-slate-500 dark:text-slate-400">
                    <svg class="w-24 h-24 mx-auto mb-6 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-2xl font-bold mb-2 text-slate-600 dark:text-slate-300">No assets yet</p>
                    <p class="text-lg">Start by depositing some!</p>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 group">
                <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-8 flex items-center gap-3">
                    <svg class="w-7 h-7 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Recent Activity
                </h2>

                <div class="space-y-4">
                    <div
                        v-for="tx in Wallet.transactions"
                        :key="tx.id"
                        role="button"
                        tabindex="0"
                        @click="router.push(`/wallet/transaction/${tx.id}`)"
                        @keydown.enter="router.push(`/wallet/transaction/${tx.id}`)"
                        class="flex items-start justify-between p-5 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-2xl transition-all duration-300 ease-in-out border-2 border-slate-200/50 dark:border-slate-600 hover:shadow-xl hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-500 cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 shadow-sm group"
                    >
                        <div class="flex items-start gap-4">
                            <div class="p-3 bg-slate-100/50 dark:bg-slate-700/50 rounded-2xl flex-shrink-0 group-hover:scale-105 transition-all duration-300 shadow-md border border-slate-200/50 dark:border-slate-600">
                                <svg v-if="tx.type === 'sent'" class="h-6 w-6 text-red-500 hover:text-red-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                <svg v-if="tx.type === 'received'" class="h-6 w-6 text-emerald-500 hover:text-emerald-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                                <svg v-if="tx.type === 'swap'" class="h-6 w-6 text-amber-500 hover:text-amber-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-black text-xl text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 truncate">{{ tx.title }}</p>
                                <p class="text-base text-slate-600 dark:text-slate-400 font-bold font-mono truncate">{{ tx.subtitle }}</p>
                            </div>
                        </div>
                        <div class="text-right space-y-2 min-w-0">
                            <p class="font-black text-2xl text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200">{{ tx.amount }}</p>
                            <span class="px-4 py-2 rounded-xl font-bold text-sm shadow-sm" :class="getStatusClasses(tx.status) + ' hover:shadow-md transition-all duration-200'">
                                {{ tx.status }}
                            </span>
                        </div>
                    </div>
                </div>
                <div v-if="Wallet.transactions.length === 0" class="text-center py-16 text-slate-500 dark:text-slate-400">
                    <svg class="w-24 h-24 mx-auto mb-6 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p class="text-2xl font-bold mb-2 text-slate-600 dark:text-slate-300">No recent activity</p>
                    <p class="text-lg">Make your first transaction!</p>
                </div>
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
import Header from '@/components/Header.vue'

const router = useRouter()
const Wallet = useWalletStore()
const Identity = useIdentityStore()
const System = useSystemStore()

const isCopied = ref(false)

const totalBalance = computed(() => {
    if (Identity.isConnected && Identity.balance) {
        const credits = parseInt(Identity.balance, 10)
        const duffs = credits / 1000
        const dash = duffs / 100000000
        const usd = dash * System.currentDashPrice
        return { dash, usd, credits, duffs }
    }
    // Fallback to mock data from wallet store
    return {
        dash: Wallet.assets.find(a => a.ticker === 'DASH')?.amount || 0,
        usd: Wallet.totalUsdValue || 0,
        credits: Wallet.assets.find(a => a.ticker === 'CREDITS')?.amount || 0,
        duffs: 0
    }
})

const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '$0.00'
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value)
}

const copyAddress = async () => {
    if (!Wallet.user?.address || isCopied.value) return
    try {
        await navigator.clipboard.writeText(Wallet.user.address)
        isCopied.value = true
        setTimeout(() => {
            isCopied.value = false
        }, 2000)
    } catch (err) {
        console.error('Failed to copy address: ', err)
        alert('Failed to copy address. Please try manually.')
    }
}

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'Completed': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-emerald-200/50 dark:shadow-emerald-500/20'
        case 'Pending...': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 shadow-amber-200/50 dark:shadow-amber-500/20 animate-pulse'
        case 'Failed': return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700 shadow-red-200/50 dark:shadow-red-500/20'
        default: return 'bg-slate-400/20 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 shadow-slate-200/50 dark:shadow-slate-500/20'
    }
}

const getIconSrc = (ticker: string) => {
    const lower = ticker.toLowerCase()
    if (lower === 'credits') {
        return '/icons/dash.svg'
    }
    return `/icons/${lower}.svg`
}

const assetIconExists = (ticker: string) => {
    const lower = ticker.toLowerCase()
    const commonIcons = ['dash', 'sans', 'dusd']
    return commonIcons.includes(lower) || lower === 'credits'
}

onMounted(async () => {
    await nextTick()

    // Always ensure we have mock data if no identity is connected
    if (!Identity.isConnected) {
        console.log('No identity found, loading mock data')
        Wallet.initializeMockData()
    } else if (Identity.isConnected && Identity.username) {
        console.log('Using identity data for user:', Identity.username)
        Wallet.user = {
            name: Identity.username,
            address: Identity.username
        }

        if (!Identity.balance) {
            await Identity.fetchBalance()
        }
    }

    // Ensure we have market data
    if (!System.currentDashPrice) {
        await System.fetchDashPrice()
    }
})
</script>
