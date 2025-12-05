<!-- src/screens/wallet/TransactionDetails.vue -->
<template>
    <main class="max-w-2xl mx-auto p-4">
        <header class="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-3">
                <button @click="router.back()" class="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors">
                    <svg class="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">Transaction Details</h1>
            </div>
        </header>

        <div v-if="selectedTx" class="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl space-y-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <!-- Transaction Summary -->
            <div class="flex items-start justify-between p-4 bg-slate-50/50 dark:bg-slate-700/50 rounded-lg">
                <div class="flex items-center gap-4 flex-1">
                    <div class="p-3 bg-slate-100/50 dark:bg-slate-700/50 rounded-full flex-shrink-0">
                        <svg v-if="selectedTx.type === 'sent'" class="h-6 w-6 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <svg v-if="selectedTx.type === 'received'" class="h-6 w-6 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <svg v-if="selectedTx.type === 'swap'" class="h-6 w-6 text-amber-500 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100 truncate">{{ selectedTx.title }}</h2>
                        <p class="text-sm text-slate-600 dark:text-slate-400 font-mono truncate">{{ selectedTx.subtitle }}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-500">ID: {{ selectedTx.id }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-2xl font-bold text-slate-900 dark:text-slate-100">{{ selectedTx.amount }}</p>
                    <span class="text-sm px-3 py-1 rounded-full font-medium" :class="getStatusClasses(selectedTx.status)">
                        {{ selectedTx.status }}
                    </span>
                </div>
            </div>

            <!-- Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <p class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Type</p>
                    <p class="text-slate-900 dark:text-slate-100 capitalize">{{ selectedTx.type }}</p>
                </div>
                <div>
                    <p class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Date</p>
                    <p class="text-slate-900 dark:text-slate-100">{{ formatDate(selectedTx.date || new Date()) }}</p>
                </div>
                <div>
                    <p class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Fee</p>
                    <p class="text-slate-900 dark:text-slate-100">~0.00001 DASH (estimated)</p>
                </div>
                <div>
                    <p class="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Confirmations</p>
                    <p class="text-slate-900 dark:text-slate-100">6 of 6</p>
                </div>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button class="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-indigo-500 hover:to-purple-500 transition-all">
                    View on Explorer
                </button>
                <button class="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                    Copy TX ID
                </button>
            </div>
        </div>

        <div v-else class="text-center py-8 text-slate-600 dark:text-slate-500 bg-white/50 dark:bg-slate-800/50 p-8 rounded-xl border border-slate-200 dark:border-slate-700">
            <p>Transaction not found.</p>
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

const txId = route.params.id as string

const selectedTx = computed(() => Wallet.transactions.find(tx => tx.id === txId))

const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US').format(date)

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'Completed': return 'bg-emerald-500/20 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50'
        case 'Pending...': return 'bg-amber-500/20 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50 animate-pulse'
        case 'Failed': return 'bg-red-500/20 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200/50 dark:border-red-800/50'
        default: return 'bg-slate-400/20 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800/50'
    }
}

onMounted(() => {
    // if (!Wallet.user) {
    //     Wallet.initializeMockData()
    // }
    if (!selectedTx.value) {
        router.back() // Redirect if invalid ID
    }
})
</script>
