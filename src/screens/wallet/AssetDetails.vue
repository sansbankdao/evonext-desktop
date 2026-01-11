<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-slate-50 dark:bg-slate-950 pb-24">
        <!-- Header -->
        <header class="w-full max-w-5xl flex items-center justify-between px-6 py-6">
            <button @click="router.push('/wallet/overview')" class="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors font-medium">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Portfolio</span>
            </button>

            <!-- Network Indicator -->
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    {{ WalletStore.network || 'testnet' }}
                </span>
            </div>
        </header>

        <!-- Main Content -->
        <div class="w-full max-w-5xl px-6 space-y-6">
            <!-- Asset Overview Card -->
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg p-8">
                <div v-if="selectedAsset" class="space-y-8">
                    <!-- Asset Header -->
                    <div class="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
                        <div class="flex items-center gap-6">
                            <div class="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border-2 border-slate-200 dark:border-slate-700 shadow-md">
                                <img
                                    :src="getIconSrc(selectedAsset.symbol)"
                                    :alt="selectedAsset.symbol"
                                    class="w-12 h-12"
                                />
                            </div>
                            <div>
                                <h1 class="text-4xl font-black text-slate-900 dark:text-white mb-1">
                                    {{ selectedAsset.name }}
                                </h1>
                                <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                    {{ selectedAsset.symbol }}
                                </p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-5xl font-black text-slate-900 dark:text-white mb-2">
                                {{ displayBalance }}
                            </p>
                            <p class="text-2xl font-bold text-slate-500 dark:text-slate-400 font-mono">
                                ≈ {{ formatCurrency(selectedAsset.usdValue || 0) }}
                            </p>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                        <button @click="router.push(`/wallet/send?asset=${selectedAsset.symbol}`)"
                                class="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Send {{ selectedAsset.symbol }}
                        </button>

                        <button class="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Receive
                        </button>

                        <!-- SWAP BUTTON - Only for tokens (not CREDITS) -->
                        <button v-if="selectedAsset.symbol.toUpperCase() !== 'CREDITS' && selectedAsset.symbol.toUpperCase() !== 'DASH'"
                                @click="goToSwap(selectedAsset.symbol)"
                                class="flex items-center justify-center gap-3 bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Swap {{ selectedAsset.symbol }}
                        </button>
                    </div>
                </div>

                <!-- Asset Not Found -->
                <div v-else class="text-center py-16">
                    <div class="w-32 h-32 mx-auto mb-8 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 border-4 border-red-200 dark:border-red-800">
                        <svg class="w-20 h-20 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 class="text-3xl font-bold text-slate-900 dark:text-white mb-2">Asset Not Found</h2>
                    <p class="text-lg text-slate-500 dark:text-slate-400 mb-8 px-4">
                        Could not find <span class="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{{ symbolParam.toUpperCase() }}</span> in your wallet
                    </p>
                    <button @click="router.push('/wallet/overview')"
                            class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-300">
                        Return to Portfolio
                    </button>
                </div>
            </div>

            <!-- Transactions & Asset Info -->
            <div v-if="selectedAsset" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Recent Transactions -->
                <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg p-8">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Recent Transactions
                        </h3>
                        <span v-if="isLoadingTransactions" class="text-sm font-bold text-amber-500 animate-pulse">Loading...</span>
                    </div>

                    <div v-if="hasTransactions && !isLoadingTransactions" class="space-y-4">
                        <div v-for="tx in filteredTransactions" :key="tx.id"
                             @click="viewTransaction(tx)"
                             class="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 cursor-pointer group">
                            <div class="flex items-center gap-4 flex-1 min-w-0">
                                <div :class="[
                                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                                    tx.direction === 'INCOMING'
                                        ? 'bg-emerald-100 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
                                        : tx.direction === 'OUTGOING'
                                        ? 'bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                        : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                ]">
                                    <svg v-if="tx.direction === 'INCOMING'" class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                    <svg v-else-if="tx.direction === 'OUTGOING'" class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    <svg v-else class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <div class="min-w-0">
                                    <p class="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                        {{ getTransactionLabel(tx) }}
                                    </p>
                                    <p class="text-sm text-slate-500 dark:text-slate-400 font-mono truncate">
                                        {{ getTransactionSubtitle(tx) }}
                                    </p>
                                    <p class="text-xs text-slate-400 dark:text-slate-500">
                                        {{ getTransactionTime(tx) }}
                                    </p>
                                </div>
                            </div>
                            <div class="text-right space-y-1 flex-shrink-0">
                                <p :class="[
                                    'font-black text-lg',
                                    tx.direction === 'INCOMING'
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : tx.direction === 'OUTGOING'
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-slate-600 dark:text-slate-400'
                                ]">
                                    {{ getTransactionAmount(tx) }}
                                </p>
                                <span class="px-3 py-1 rounded-full text-xs font-bold" :class="getStatusClasses(tx.status)">
                                    {{ tx.status || 'Unknown' }}
                                </span>
                            </div>
                        </div>

                        <!-- View All Transactions Link -->
                        <div v-if="filteredTransactions.length > 5"
                             @click="router.push('/wallet/overview')"
                             class="text-center pt-4 border-t border-slate-100 dark:border-slate-800 cursor-pointer group">
                            <span class="text-sm font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                                View All {{ filteredTransactions.length }} Transactions →
                            </span>
                        </div>
                    </div>

                    <!-- No Transactions State -->
                    <div v-else-if="!isLoadingTransactions" class="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                        <svg class="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p class="text-lg font-bold text-slate-500 dark:text-slate-400">No transactions found</p>
                        <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">for {{ selectedAsset.symbol }}</p>
                    </div>

                    <!-- Loading State -->
                    <div v-else class="text-center py-12">
                        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading transactions...</p>
                    </div>
                </div>

                <!-- Asset Info Card -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg p-8">
                    <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Asset Details
                    </h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Symbol</span>
                            <span class="font-mono font-bold text-slate-900 dark:text-white">{{ selectedAsset.symbol }}</span>
                        </div>
                        <div class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Type</span>
                            <span class="font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                {{ getAssetType(selectedAsset) }}
                            </span>
                        </div>
                        <div class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Raw Balance</span>
                            <span class="font-mono text-slate-900 dark:text-white">
                                {{ Number(selectedAsset.balance).toLocaleString() }}
                            </span>
                        </div>
                        <div class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Network</span>
                            <span class="font-bold uppercase text-slate-900 dark:text-white">
                                {{ selectedAsset.network || WalletStore.network || 'testnet' }}
                            </span>
                        </div>
                        <div v-if="selectedAsset.contractId" class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Contract ID</span>
                            <span class="font-mono text-xs text-slate-500 truncate max-w-[150px]">
                                {{ selectedAsset.contractId }}
                            </span>
                        </div>
                        <div class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Decimals</span>
                            <span class="font-mono text-slate-900 dark:text-white">
                                {{ selectedAsset.decimals || 'N/A' }}
                            </span>
                        </div>
                        <!-- <div v-if="selectedAsset.lastUpdated" class="flex justify-between items-center py-3">
                            <span class="text-slate-600 dark:text-slate-400">Updated</span>
                            <span class="text-sm text-slate-500 dark:text-slate-400">
                                {{ formatLastUpdated(selectedAsset.lastUpdated) }}
                            </span>
                        </div> -->
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useNetwork } from '@/composables/useNetwork'
import { DUSD_DECIMAL_PLACES, SANS_DECIMAL_PLACES } from '@/constants'
import type { IAsset, ITransaction } from '@/types'

const route = useRoute()
const router = useRouter()
const WalletStore = useWalletStore()
const { ensure } = useNetwork()

const isLoadingTransactions = ref(false)

// Extract symbol from route with proper TypeScript handling
const symbolParam = computed(() => {
    const s = route.params.symbol as string | string[] | undefined
    if (!s) return ''

    if (Array.isArray(s)) {
        return (s[0] || '').toUpperCase()
    }

    return s.toUpperCase()
})

// Find the selected asset
const selectedAsset = computed(() => {
    return WalletStore.assets.find(a => a.symbol.toUpperCase() === symbolParam.value)
})

// Get asset type for display
const getAssetType = (asset: IAsset) => {
    const normalized = asset.symbol.toUpperCase()
    if (normalized === 'CREDITS') return 'CREDITS'
    if (normalized === 'DASH') return 'COIN'
    if (normalized.includes('DUSD')) return 'TOKEN'
    if (normalized.includes('SANS')) return 'TOKEN'

    // Use asset.type if it exists, fallback to symbol detection
    return (asset.type || 'ASSET').toUpperCase()
}

// Get normalized balance (COPY from Overview page)
const getNormalizedSymbol = (symbol: string) => {
    return symbol.replace(/^t/i, '').toLowerCase()
}

const displayBalance = computed(() => {
    const asset = selectedAsset.value
    if (!asset || asset.balance === undefined || asset.balance === null) {
        return '0.00'
    }

    const numericBalance = Number(asset.balance)
    const normalizedSymbol = getNormalizedSymbol(asset.symbol)

    // CREDITS: Raw credits → Dash conversion
    if (normalizedSymbol === 'credits') {
        const dash = numericBalance / 100_000_000_000
        return dash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
    }

    // DUSD: 6 decimals
    if (normalizedSymbol === 'dusd') {
        const normalized = numericBalance / (10 ** DUSD_DECIMAL_PLACES)
        return normalized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    // SANS: 8 decimals
    if (normalizedSymbol === 'sans') {
        const normalized = numericBalance / (10 ** SANS_DECIMAL_PLACES)
        return normalized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
    }

    // DASH: Heuristic approach (determine if already normalized)
    if (normalizedSymbol === 'dash') {
        const isNormalizedDASH = numericBalance < 1_000_000
        const normalized = isNormalizedDASH ? numericBalance : numericBalance / 100_000_000
        return normalized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
    }

    return numericBalance.toLocaleString()
})

// Filter transactions for this specific asset
const filteredTransactions = computed(() => {
    if (!selectedAsset.value) return []

    const symbol = selectedAsset.value.symbol.toUpperCase()

    // Filter transactions by asset symbol with robust matching
    return WalletStore.transactions.filter(tx => {
        // Use assetSymbol property from Transaction type
        const txSymbol = (tx.assetSymbol || '').toUpperCase()

        // Match exact symbol
        return txSymbol === symbol
    })
    // Sort by timestamp (newest first)
    .sort((a, b) => {
        const timeA = a.timestamp || a.createdAt || 0
        const timeB = b.timestamp || b.createdAt || 0
        return Number(timeB) - Number(timeA)
    })
    // Limit to 10 most recent
    .slice(0, 10)
})

const hasTransactions = computed(() => filteredTransactions.value.length > 0)

// Transaction formatters
const getTransactionLabel = (tx: ITransaction) => {
    if (tx.direction === 'INCOMING') return 'Received'
    if (tx.direction === 'OUTGOING') return 'Sent'
    if (tx.direction === 'SELF') return 'Self Transfer'

    // Fallback to type field if exists
    if (tx.type === 'IDENTITY_CREDIT_TRANSFER') return 'Credit Transfer'
    if (tx.type === 'IDENTITY_TOKEN_TRANSFER') return 'Token Transfer'
    if (tx.type === 'IDENTITY_CREATE') return 'Identity Created'

    return tx.title || tx.type || 'Transaction'
}

const getTransactionSubtitle = (tx: ITransaction) => {
    if (tx.direction === 'INCOMING' && tx.senderId) {
        return `From: ${tx.senderId.substring(0, 8)}...`
    }
    if (tx.direction === 'OUTGOING' && tx.receiverId) {
        return `To: ${tx.receiverId.substring(0, 8)}...`
    }

    // Fallback to subtitle or hash
    if (tx.subtitle) return tx.subtitle
    if (tx.hash) return `TX: ${tx.hash.substring(0, 8)}...`

    return `Type: ${tx.type}`
}

const getTransactionTime = (tx: ITransaction) => {
    const timestamp = tx.timestamp || tx.createdAt || tx.date
    if (!timestamp) return 'Recently'

    const date = new Date(Number(timestamp))
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}

const getTransactionAmount = (tx: ITransaction) => {
    if (!selectedAsset.value) return '0.00'

    const amount = Number(tx.amount) || 0
    const assetSymbol = selectedAsset.value.symbol.toUpperCase()

    // Format based on asset type
    if (assetSymbol === 'CREDITS') {
        const dash = amount / 100_000_000_000
        const formatted = dash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
        return `${formatted} DASH`
    }

    if (assetSymbol.includes('DUSD')) {
        const normalized = amount / (10 ** DUSD_DECIMAL_PLACES)
        const formatted = normalized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        const prefix = tx.direction === 'INCOMING' ? '+' : (tx.direction === 'OUTGOING' ? '-' : '')
        return `${prefix}${formatted} DUSD`
    }

    if (assetSymbol.includes('SANS')) {
        const normalized = amount / (10 ** SANS_DECIMAL_PLACES)
        const formatted = normalized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
        const prefix = tx.direction === 'INCOMING' ? '+' : (tx.direction === 'OUTGOING' ? '-' : '')
        return `${prefix}${formatted} SANS`
    }

    if (assetSymbol === 'DASH') {
        const isNormalized = amount < 1_000_000
        const normalized = isNormalized ? amount : amount / 100_000_000
        const formatted = normalized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
        const prefix = tx.direction === 'INCOMING' ? '+' : (tx.direction === 'OUTGOING' ? '-' : '')
        return `${prefix}${formatted} DASH`
    }

    // Fallback with formatted amount if available
    if (tx.amountFormatted) {
        const prefix = tx.direction === 'INCOMING' ? '+' : (tx.direction === 'OUTGOING' ? '-' : '')
        return `${prefix}${tx.amountFormatted} ${assetSymbol}`
    }

    const prefix = tx.direction === 'INCOMING' ? '+' : (tx.direction === 'OUTGOING' ? '-' : '')
    return `${prefix}${amount.toLocaleString()} ${assetSymbol}`
}

const formatLastUpdated = (timestamp?: string | number | Date) => {
    if (!timestamp) return 'Just now'
    try {
        const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp)
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
        return 'Just now'
    }
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(value || 0)
}

const getStatusClasses = (status?: string) => {
    if (!status) return 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'

    const stat = status.toLowerCase()
    if (stat.includes('complete') || stat.includes('success') || stat.includes('confirmed')) {
        return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
    }
    if (stat.includes('pending') || stat.includes('processing')) {
        return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse'
    }
    if (stat.includes('fail') || stat.includes('error') || stat.includes('rejected')) {
        return 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
    }
    return 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
}

const getIconSrc = (symbol: string) => {
    const lower = symbol.toLowerCase()
    const cleanSymbol = lower.startsWith('t') ? lower.substring(1) : lower
    return cleanSymbol === 'credits' ? '/icons/dash.svg' : `/icons/${cleanSymbol}.svg`
}

// Navigation to swap page with asset pre-selected
const goToSwap = (symbol: string) => {
    router.push(`/wallet/swap?from=${encodeURIComponent(symbol)}`)
}

// Navigate to transaction details
const viewTransaction = (tx: ITransaction) => {
    // Use tx.id (required per ITransaction interface)
    if (tx.id) {
        router.push(`/wallet/transaction/${tx.id}`)
    }
}

// Load initial data
onMounted(async () => {
    try {
        isLoadingTransactions.value = true

        // Ensure network is ready
        const currentNetwork = await ensure()
        console.log(`🌐 Network initialized: ${currentNetwork}`)

        // Refresh balances if store is empty
        if (WalletStore.assets.length === 0) {
            await WalletStore.refreshBalances(currentNetwork)
        }

        // Verify asset exists
        if (!selectedAsset.value) {
            console.warn(`Asset ${symbolParam.value} not found in store`)
        }

    } catch (err) {
        console.error('Failed to load asset details:', err)
    } finally {
        isLoadingTransactions.value = false
    }
})

// Cleanup
onBeforeUnmount(() => {
    // Any cleanup if needed
})
</script>
