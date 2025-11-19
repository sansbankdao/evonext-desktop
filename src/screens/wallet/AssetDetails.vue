<!-- src/screens/wallet/AssetDetails.vue -->
<template>
    <main class="max-w-2xl mx-auto p-4">
        <header class="flex items-center justify-between mb-8 pb-4 border-b border-slate-700">
            <div class="flex items-center gap-3">
                <button @click="router.back()" class="p-2 rounded-md hover:bg-slate-700/50 transition-colors">
                    <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <h1 class="text-3xl font-bold text-white">
                    {{ selectedAsset?.name || 'Asset Details' }}
                </h1>
            </div>
        </header>

        <div v-if="selectedAsset" class="bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl space-y-6 shadow-lg border border-slate-700">
            <!-- Asset Summary -->
            <div class="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                <div class="flex items-center gap-4">
                    <div class="relative size-16 bg-white/10 rounded-full p-3 flex items-center justify-center border border-slate-600/50">
                        <img
                            v-if="assetIconExists(selectedAsset.ticker.toLowerCase())"
                            :src="`/icons/${selectedAsset.ticker.toLowerCase()}.svg`"
                            :alt="selectedAsset.ticker"
                            class="size-10"
                        />
                        <svg v-else class="size-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 class="text-2xl font-bold text-white">{{ selectedAsset.name }}</h2>
                        <p class="text-sm text-slate-400 font-mono">{{ selectedAsset.ticker }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-3xl font-bold text-white">{{ selectedAsset.amount.toLocaleString() }} {{ selectedAsset.ticker }}</p>
                    <p class="text-lg text-slate-300">{{ formatCurrency(selectedAsset.usdValue) }}</p>
                </div>
            </div>

            <!-- Actions -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button @click="router.push('/wallet/send')" class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-indigo-500/25">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send
                </button>
                <!-- Add more actions like "Receive" or "Swap" as needed -->
            </div>

            <!-- Recent Transactions for This Asset -->
            <div>
                <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Recent Transactions
                </h3>
                <div class="space-y-3 max-h-64 overflow-y-auto">
                    <div
                        v-for="tx in filteredTransactions"
                        :key="tx.id"
                        role="button"
                        tabindex="0"
                        @click="router.push(`/wallet/transaction/${tx.id}`)"
                        @keydown.enter="router.push(`/wallet/transaction/${tx.id}`)"
                        class="flex items-center justify-between p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-all duration-200 ease-in-out cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <div class="flex items-center gap-3">
                            <div class="p-2 bg-slate-700/50 rounded-full">
                                <svg v-if="tx.type === 'sent'" class="h-4 w-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                <svg v-if="tx.type === 'received'" class="h-4 w-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                            </div>
                            <div>
                                <p class="font-semibold text-white text-sm">{{ tx.title }}</p>
                                <p class="text-xs text-slate-400 font-mono">{{ tx.subtitle }}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-white text-sm">{{ tx.amount }}</p>
                            <span class="text-xs px-2 py-1 rounded-full font-medium" :class="getStatusClasses(tx.status)">
                                {{ tx.status }}
                            </span>
                        </div>
                    </div>
                </div>
                <p v-if="filteredTransactions.length === 0" class="text-center py-8 text-slate-500">No transactions for this asset yet.</p>
            </div>
        </div>

        <div v-else class="text-center py-8 text-slate-500">
            <p>Asset not found.</p>
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
        case 'Completed': return 'bg-green-900/50 text-green-300 border border-green-800/50'
        case 'Pending...': return 'bg-yellow-900/50 text-yellow-300 border border-yellow-800/50 animate-pulse'
        case 'Failed': return 'bg-red-900/50 text-red-300 border border-red-800/50'
        default: return 'bg-slate-900/50 text-slate-300 border border-slate-800/50'
    }
}

const assetIconExists = (ticker: string) => true // Simplified

onMounted(() => {
    if (!Wallet.user) {
        Wallet.initializeMockData()
    }
    if (!selectedAsset.value) {
        router.back() // Redirect if invalid ticker
    }
})
</script>
