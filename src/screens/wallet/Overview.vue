<!-- src/screens/wallet/Overview.vue -->
<template>
    <main class="p-4 max-w-7xl mx-auto">
        <!-- Header (unchanged) -->
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 pb-4 border-b border-slate-700">
            <div class="flex items-center gap-3">
                <svg class="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>
                <h1 class="text-3xl font-bold text-white">
                    Wallet Dashboard
                </h1>
            </div>

            <div v-if="Wallet.user" class="flex items-center gap-3 bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg border border-slate-700 w-full sm:w-auto ml-0 sm:ml-auto">
                <div class="flex-grow flex flex-col overflow-hidden">
                    <span class="text-indigo-100 text-base font-semibold px-2 tracking-wide truncate">
                        {{ Wallet.user.name }}
                    </span>
                    <span class="text-slate-400 text-xs font-mono px-2 tracking-tight truncate">
                        {{ Wallet.user.address.slice(0, 10) }}...{{ Wallet.user.address.slice(-10) }}
                    </span>
                </div>

                <button @click="copyAddress" class="p-2 rounded-md hover:bg-slate-700/50 transition-colors flex-shrink-0 relative">
                    <svg v-if="!isCopied" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <svg v-else class="h-5 w-5 text-green-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                </button>
            </div>
        </header>

        <!-- Balance Card & Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-gradient-to-br from-slate-800/90 to-slate-900/50 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-slate-700">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex-1">
                        <p class="text-slate-400 text-sm uppercase tracking-wide font-medium mb-2">
                            Total Balance
                        </p>

                        <p class="text-4xl font-bold bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                            {{ formatCurrency(Wallet.totalUsdValue) }}
                        </p>

                        <div v-if="Wallet.balanceChange" class="mt-2 flex items-center gap-1">
                            <svg class="w-4 h-4" :class="Wallet.balanceChange.isPositive ? 'text-green-400' : 'text-red-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path v-show="Wallet.balanceChange.isPositive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4 10-10" />
                                <path v-show="!Wallet.balanceChange.isPositive" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l-4 4-10 10" />
                            </svg>
                            <span class="text-sm" :class="Wallet.balanceChange.isPositive ? 'text-green-400' : 'text-red-400'">
                                {{ Wallet.balanceChange.isPositive ? '+' : '-' }}{{ Wallet.balanceChange.percent.toFixed(2) }}% ({{ formatCurrency(Wallet.balanceChange.amount) }}) vs last 24h
                            </span>
                        </div>
                    </div>

                    <div class="flex-shrink-0 flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-full text-sm border border-slate-600">
                        <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        <span class="text-slate-300">
                            Dash Platform
                        </span>
                    </div>
                </div>

                <div class="flex flex-col sm:flex-row gap-3">
                    <button @click="router.push('/wallet/deposit')" class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-green-500 hover:to-green-400 transition-all shadow-lg hover:shadow-green-500/25">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Deposit</span>
                    </button>

                    <button @click="router.push('/wallet/send')" class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-indigo-500/25">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        <span>Send</span>
                    </button>

                    <button @click="router.push('/wallet/swap')" class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-amber-500 hover:to-amber-400 transition-all shadow-lg hover:shadow-amber-500/25">
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Swap</span>
                    </button>
                </div>
            </div>

            <!-- Collectibles (unchanged) -->
            <div class="bg-gradient-to-br from-slate-800/90 to-slate-900/50 backdrop-blur-sm p-6 rounded-xl shadow-xl border border-slate-700 flex flex-col justify-center items-center text-center">
                <div class="w-12 h-12 bg-slate-700/50 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                </div>
                <p class="text-2xl font-bold text-white">
                    Collectibles
                </p>

                <p class="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">
                    Unique digital assets
                </p>

                <button class="mt-4 bg-slate-700/50 text-slate-300 font-semibold py-2 px-4 rounded-lg hover:bg-slate-600/50 border border-slate-600 transition-all text-sm tracking-wide">
                    Coming Soon
                </button>
            </div>
        </div>

        <!-- Assets & Transactions (with icon mapping fix) -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <!-- Assets List -->
            <div class="bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
                <h2 class="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        class="flex items-center justify-between p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-200 ease-in-out border border-slate-600 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                        <div class="flex items-center gap-4">
                            <div class="relative size-12 bg-white/10 rounded-full p-2 flex items-center justify-center border border-slate-600/50 group-hover:scale-105 transition-transform duration-200 ease-in-out">
                                <img
                                    v-if="assetIconExists(asset.ticker.toLowerCase())"
                                    :src="getIconSrc(asset.ticker)"
                                    :alt="asset.ticker"
                                    class="size-8"
                                />
                                <svg v-else class="size-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div class="group">
                                <p class="font-semibold text-white hover:text-indigo-300 transition-colors duration-200">{{ asset.name }}</p>
                                <p class="text-sm text-slate-400 font-mono">{{ asset.ticker }}</p>
                            </div>
                        </div>
                        <div class="text-right space-y-1">
                            <p class="font-bold text-white text-lg hover:text-indigo-400 transition-colors duration-200">{{ asset.amount.toLocaleString() }} {{ asset.ticker }}</p>
                            <p class="text-sm text-slate-300">{{ formatCurrency(asset.usdValue) }}</p>
                        </div>
                    </div>
                </div>
                <div v-if="Wallet.assets.length === 0" class="text-center py-8 text-slate-500">
                    <svg class="w-16 h-16 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No assets yet. Start by depositing some!</p>
                </div>
            </div>

            <!-- Recent Transactions (unchanged except icon if needed; no assets here) -->
            <div class="bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl shadow-lg border border-slate-700">
                <h2 class="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        class="flex items-start justify-between p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-200 ease-in-out border border-slate-600 hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                    >
                        <div class="flex items-start gap-4">
                            <div class="p-2 bg-slate-700/50 rounded-full flex-shrink-0 group-hover:scale-105 transition-transform duration-200 ease-in-out">
                                <svg v-if="tx.type === 'sent'" class="h-5 w-5 text-red-400 hover:text-red-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                <svg v-if="tx.type === 'received'" class="h-5 w-5 text-green-400 hover:text-green-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                                <svg v-if="tx.type === 'swap'" class="h-5 w-5 text-amber-400 hover:text-amber-300 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <div class="flex-1 min-w-0 group">
                                <p class="font-semibold text-white hover:text-indigo-300 transition-colors duration-200 truncate">{{ tx.title }}</p>
                                <p class="text-sm text-slate-400 font-mono truncate">{{ tx.subtitle }}</p>
                            </div>
                        </div>
                        <div class="text-right space-y-1 min-w-0">
                            <p class="font-semibold text-white text-base hover:text-indigo-400 transition-colors duration-200">{{ tx.amount }}</p>
                            <span class="text-xs px-2 py-1 rounded-full font-medium" :class="getStatusClasses(tx.status) + ' hover:shadow-sm transition-shadow duration-200'">
                                {{ tx.status }}
                            </span>
                        </div>
                    </div>
                </div>
                <div v-if="Wallet.transactions.length === 0" class="text-center py-8 text-slate-500">
                    <svg class="w-16 h-16 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No recent activity. Make your first transaction!</p>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'

const router = useRouter()
const Wallet = useWalletStore()

const isCopied = ref(false)

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
        case 'Completed': return 'bg-green-900/50 text-green-300 border border-green-800/50'
        case 'Pending...': return 'bg-yellow-900/50 text-yellow-300 border border-yellow-800/50 animate-pulse'
        case 'Failed': return 'bg-red-900/50 text-red-300 border border-red-800/50'
        default: return 'bg-slate-900/50 text-slate-300 border border-slate-800/50'
    }
}

// Updated to handle 'credits' by mapping to 'dash.svg' (or fallback)
const getIconSrc = (ticker: string) => {
    const lower = ticker.toLowerCase()
    if (lower === 'credits') {
        return '/icons/dash.svg' // Map Dash Credits to DASH icon; adjust if needed
    }
    return `/icons/${lower}.svg`
}

const assetIconExists = (ticker: string) => {
    const lower = ticker.toLowerCase()
    // Assume common icons exist; return false for unmapped to trigger fallback
    const commonIcons = ['dash', 'sans', 'dusd']
    return commonIcons.includes(lower) || lower === 'credits' // 'credits' now mapped, so true
}

onMounted(() => {
    if (!Wallet.user) {
        Wallet.initializeMockData()
    }
})
</script>
