<!-- src/screens/wallet/AssetDetails.vue -->
<template>
    <main class="p-6 max-w-2xl mx-auto min-h-screen">
        <!-- Header -->
        <header class="flex items-center justify-between mb-8 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-lg border-2 border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-4">
                <button @click="router.back()" class="p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 shadow-sm hover:shadow-md group">
                    <svg class="w-6 h-6 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {{ selectedAsset?.name || 'Asset Details' }}
                </h1>
            </div>
        </header>

        <div v-if="selectedAsset" class="bg-white dark:bg-slate-800 p-8 rounded-2xl space-y-8 shadow-2xl border-2 border-slate-200 dark:border-slate-700 hover:shadow-3xl hover:-translate-y-1 transition-all duration-300 group">
            <!-- Asset Summary -->
            <div class="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl border-2 border-slate-200/50 dark:border-slate-600">
                <div class="flex items-center gap-6">
                    <div class="relative size-20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-4 flex items-center justify-center border-2 border-indigo-200/50 dark:border-indigo-800/50 shadow-xl group-hover:scale-105 transition-all duration-300">
                        <img
                            v-if="assetIconExists(selectedAsset.ticker.toLowerCase())"
                            :src="`/icons/${selectedAsset.ticker.toLowerCase()}.svg`"
                            :alt="selectedAsset.ticker"
                            class="size-12"
                        />
                        <svg v-else class="size-10 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-4xl font-black text-slate-900 dark:text-slate-100 mb-1 tracking-tight">{{ selectedAsset.name }}</h2>
                        <p class="text-2xl font-bold text-slate-600 dark:text-slate-400 font-mono tracking-widest uppercase">{{ selectedAsset.ticker }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-5xl font-black text-slate-900 dark:text-slate-100 mb-2">{{ selectedAsset.amount.toLocaleString() }}</p>
                    <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-1 font-mono">{{ selectedAsset.ticker }}</p>
                    <p class="text-xl text-slate-600 dark:text-slate-400 font-bold">{{ formatCurrency(selectedAsset.usdValue) }}</p>
                </div>
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button @click="router.push('/wallet/send')" class="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black py-5 px-8 rounded-2xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-2xl hover:shadow-3xl hover:-translate-y-1 focus:ring-4 focus:ring-indigo-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 text-lg tracking-wide">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span>Send</span>
                </button>
                <button class="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-black py-5 px-8 rounded-2xl hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-2xl hover:shadow-3xl hover:-translate-y-1 focus:ring-4 focus:ring-emerald-400/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 text-lg tracking-wide">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>Receive</span>
                </button>
            </div>

            <!-- Recent Transactions for This Asset -->
            <div>
                <h3 class="text-2xl font-black text-slate-900 dark:text-slate-100 mb-8 flex items-center gap-3">
                    <svg class="w-8 h-8 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Recent Transactions
                </h3>
                <div class="space-y-4 max-h-96 overflow-y-auto">
                    <div
                        v-for="tx in filteredTransactions"
                        :key="tx.id"
                        role="button"
                        tabindex="0"
                        @click="router.push(`/wallet/transaction/${tx.id}`)"
                        @keydown.enter="router.push(`/wallet/transaction/${tx.id}`)"
                        class="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-2xl transition-all duration-300 ease-in-out cursor-pointer focus:outline-none focus:ring-4 focus:ring-indigo-400/30 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 shadow-lg hover:shadow-2xl hover:-translate-y-1 border-2 border-slate-200/50 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 group"
                    >
                        <div class="flex items-center gap-4">
                            <div class="p-4 bg-gradient-to-br from-slate-100/50 to-slate-200/50 dark:from-slate-700/50 dark:to-slate-600/50 rounded-2xl flex-shrink-0 group-hover:scale-105 transition-all duration-300 shadow-md border border-slate-200/50 dark:border-slate-600">
                                <svg v-if="tx.type === 'sent'" class="h-7 w-7 text-red-500 hover:text-red-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                <svg v-if="tx.type === 'received'" class="h-7 w-7 text-emerald-500 hover:text-emerald-400 transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                            <div>
                                <p class="font-black text-2xl text-slate-900 dark:text-slate-100 truncate">{{ tx.title }}</p>
                                <p class="text-lg text-slate-600 dark:text-slate-400 font-mono font-bold truncate">{{ tx.subtitle }}</p>
                            </div>
                        </div>
                        <div class="text-right space-y-2">
                            <p class="font-black text-3xl text-slate-900 dark:text-slate-100">{{ tx.amount }}</p>
                            <span class="px-6 py-3 rounded-2xl font-bold text-lg shadow-lg" :class="getStatusClasses(tx.status) + ' hover:shadow-xl transition-all duration-200'">
                                {{ tx.status }}
                            </span>
                        </div>
                    </div>
                </div>
                <div v-if="filteredTransactions.length === 0" class="text-center py-16 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-700/30 rounded-2xl p-8 border-2 border-slate-200/50 dark:border-slate-600">
                    <svg class="w-32 h-32 mx-auto mb-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p class="text-3xl font-black mb-4 text-slate-600 dark:text-slate-300">No transactions</p>
                    <p class="text-xl font-bold text-slate-500 dark:text-slate-400">for this asset yet</p>
                </div>
            </div>
        </div>

        <div v-else class="text-center py-20 bg-white/50 dark:bg-slate-800/50 rounded-2xl p-12 border-2 border-slate-200 dark:border-slate-700 shadow-xl">
            <svg class="w-32 h-32 mx-auto mb-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 class="text-4xl font-black text-slate-600 dark:text-slate-400 mb-4">Asset Not Found</h2>
            <p class="text-xl text-slate-500 dark:text-slate-400">Please select a valid asset from the overview</p>
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'

const route = useRoute()
const router = useRouter()
const Wallet = useWalletStore()

const ticker = route.params.ticker as string

const selectedAsset = computed(() => Wallet.assets.find(asset => asset.ticker === ticker))

const filteredTransactions = computed(() => {
    // Mock filter: In real app, filter by asset ticker from store or API
    return Wallet.transactions.filter(tx => tx.title.includes(ticker) || tx.amount.includes(ticker))
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
        case 'Completed': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300/50 dark:border-emerald-700 shadow-emerald-200/50 dark:shadow-emerald-500/20'
        case 'Pending...': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-2 border-amber-300/50 dark:border-amber-700 shadow-amber-200/50 dark:shadow-amber-500/20 animate-pulse'
        case 'Failed': return 'bg-red-500/20 text-red-700 dark:text-red-300 border-2 border-red-300/50 dark:border-red-700 shadow-red-200/50 dark:shadow-red-500/20'
        default: return 'bg-slate-400/20 text-slate-700 dark:text-slate-300 border-2 border-slate-300/50 dark:border-slate-600 shadow-slate-200/50 dark:shadow-slate-500/20'
    }
}

const assetIconExists = (_ticker: string) => true // Simplified

onMounted(() => {
    if (!Wallet.user) {
        Wallet.initializeMockData()
    }
    if (!selectedAsset.value) {
        router.back() // Redirect if invalid ticker
    }
})
</script>
