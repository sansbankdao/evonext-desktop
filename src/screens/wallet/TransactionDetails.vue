<!-- src/screens/wallet/TransactionDetails.vue -->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'

const route = useRoute()
const router = useRouter()
const Wallet = useWalletStore()

const txId = route.params.id as string

const selectedTx = computed(() => Wallet.transactions.find(tx => tx.id === txId))

const formatDate = (date: Date) => new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
}).format(date)

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'Completed': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        case 'Pending...': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse'
        case 'Failed': return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        default: return 'bg-slate-50 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
    }
}

const getTypeIcon = (type: string) => {
    switch (type) {
        case 'sent': return 'M5 10l7-7m0 0l7 7m-7-7v18'
        case 'received': return 'M19 14l-7 7m0 0l-7-7m7 7V3'
        case 'swap': return 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
        default: return 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    }
}

const getTypeColor = (type: string) => {
    switch (type) {
        case 'sent': return 'text-red-500'
        case 'received': return 'text-emerald-500'
        case 'swap': return 'text-amber-500'
        default: return 'text-slate-500'
    }
}

// Helper to get human-readable title
const getHumanReadableType = (tx: any) => {
    if (!tx) return 'Transaction'

    let action = ''

    // Map types to actions
    if (tx.type === 'sent') action = 'Sent'
    else if (tx.type === 'received') action = 'Received'
    else if (tx.type === 'swap') action = 'Swapped'
    else action = 'Transfer'

    // Map Asset Types to human-readable strings
    let asset = ''
    if (tx.assetType === 'COIN') asset = 'Dash'
    else if (tx.assetType === 'TOKEN') asset = 'Tokens'
    else if (tx.symbol) asset = tx.symbol // Fallback if symbol exists
    else asset = 'Assets'

    return `${action} ${asset}`
}

// Helper to generate explorer URL based on network
const explorerUrl = computed(() => {
    if (!selectedTx.value) return '#'

    const baseUrl = Wallet.network === 'testnet'
        ? 'https://testnet.platform-explorer.com'
        : 'https://platform-explorer.com'

    // Determine path based on transaction type (using tx.id as the identifier)
    // Note: Some explorers use /transaction/ or /tx/, we use /transaction/ based on your example
    return `${baseUrl}/transaction/${selectedTx.value.id}`
})

// Helper to copy ID
const copyTxId = async () => {
    if (selectedTx.value) {
        try {
            await navigator.clipboard.writeText(selectedTx.value.id)
        } catch (err) {
            console.error('Failed to copy', err)
        }
    }
}

onMounted(() => {
    if (!selectedTx.value) {
        router.back()
    }
})
</script>

<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-slate-50 dark:bg-slate-950 pb-12">

        <!-- Navigation Header -->
        <header class="w-full max-w-5xl flex items-center justify-between px-6 py-6">
            <button
                @click="router.back()"
                class="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors font-medium"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back</span>
            </button>

            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div class="w-2 h-2 rounded-full" :class="selectedTx?.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'"></div>
                <span class="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                    {{ selectedTx?.status || 'Unknown' }}
                </span>
            </div>
        </header>

        <!-- Main Content (Wide Layout) -->
        <div class="w-full max-w-5xl px-6 space-y-6">

            <!-- Main Card -->
            <div v-if="selectedTx" class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                <!-- Header Summary -->
                <div class="bg-slate-50/50 dark:bg-slate-950/50 p-8 pb-8 border-b border-slate-200 dark:border-slate-800 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8">
                    <div class="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex-shrink-0">
                        <svg class="w-8 h-8" :class="getTypeColor(selectedTx.type)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" :d="getTypeIcon(selectedTx.type)" />
                        </svg>
                    </div>

                    <div class="flex-1 text-left md:text-left w-full">
                        <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                            {{ getHumanReadableType(selectedTx) }}
                        </h1>
                        <p class="text-sm text-slate-500 dark:text-slate-400 font-mono break-all">
                            {{ selectedTx.subtitle || selectedTx.hash }}
                        </p>
                    </div>

                    <div class="text-left md:text-right shrink-0 w-full md:w-auto">
                        <p class="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {{ selectedTx.amountFormatted || selectedTx.amount }}
                        </p>
                        <span class="inline-block mt-2 px-3 py-1 rounded-lg text-xs font-bold border" :class="getStatusClasses(selectedTx.status)">
                            {{ selectedTx.status }}
                        </span>
                    </div>
                </div>

                <div class="p-8">
                    <!-- Details Grid -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <div class="space-y-2">
                            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Transaction Type
                            </label>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <span class="text-sm font-bold text-slate-900 dark:text-white capitalize">
                                    {{ selectedTx.type }}
                                </span>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Date & Time
                            </label>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <span class="text-sm font-medium text-slate-900 dark:text-white break-words">
                                    {{ formatDate(new Date(selectedTx.createdAt) || new Date()) }}
                                </span>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Network Fee
                            </label>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <div class="flex items-center gap-2">
                                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    <span class="text-sm font-medium text-slate-900 dark:text-white">
                                        ~0.00001 DASH
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-2">
                            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Confirmations
                            </label>
                            <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                                <div class="flex items-center gap-2">
                                    <svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span class="text-sm font-medium text-slate-900 dark:text-white">
                                        {{ selectedTx.confirmations || 6 }} of 6
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Full ID Display Row -->
                    <div class="space-y-2 mb-8">
                        <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Transaction ID
                        </label>
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <span class="text-sm font-mono text-slate-900 dark:text-slate-100 select-all break-all">
                                {{ selectedTx.id }}
                            </span>
                            <div class="flex-1"></div>
                            <button
                                @click="copyTxId"
                                class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 transition-colors shrink-0"
                                title="Copy ID"
                            >
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex md:flex-row gap-4 pt-6 border-t border-slate-200 dark:border-slate-800">
                        <a
                            :href="explorerUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span>View on Explorer</span>
                        </a>
                    </div>

                </div>

            </div>

            <!-- Not Found State -->
            <div v-else class="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
                <div class="p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                    <svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h3 class="text-xl font-bold text-slate-900 dark:text-white">Transaction Not Found</h3>
                <p class="text-slate-500 dark:text-slate-400 text-center max-w-md">
                    We couldn't find a transaction with that ID in your local history.
                </p>
                <button @click="router.back()" class="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                    Go Back
                </button>
            </div>

        </div>
    </main>
</template>
