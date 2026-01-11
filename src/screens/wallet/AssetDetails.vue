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

            <div class="flex items-center gap-4">
                <button @click="toggleDebug" class="px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-2">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    DEBUG
                </button>
            </div>
        </header>

        <!-- Main Content -->
        <div class="w-full max-w-5xl px-6 space-y-6">
            <!-- Asset Overview Card (Full Width) -->
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
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-md mx-auto">
                        <button @click="router.push('/wallet/send')" class="flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Send {{ selectedAsset.symbol }}
                        </button>
                        <button class="flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            Receive
                        </button>
                    </div>
                </div>

                <!-- Asset Not Found -->
                <div v-else class="text-center py-16">
                    <svg class="w-32 h-32 mx-auto mb-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 class="text-3xl font-bold text-slate-600 dark:text-slate-400 mb-2">Asset Not Found</h2>
                    <p class="text-lg text-slate-500 dark:text-slate-500 mb-8">
                        Could not find <span class="font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{{ symbolParam.toUpperCase() }}</span> in your wallet
                    </p>
                    <button @click="router.push('/wallet/overview')" class="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg">
                        Return to Portfolio
                    </button>
                </div>
            </div>

            <!-- Transactions Section -->
            <div v-if="selectedAsset" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg p-8">
                    <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                        <svg class="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Recent Transactions
                    </h3>

                    <div v-if="filteredTransactions.length > 0" class="space-y-4">
                        <div v-for="tx in filteredTransactions" :key="tx.id"
                             @click="router.push(`/wallet/transaction/${tx.id}`)"
                             class="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer group">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                                    <svg v-if="tx.type === 'sent'" class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                    <svg v-else-if="tx.type === 'received'" class="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                    <svg v-else-if="tx.type === 'swap'" class="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    <svg v-else class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-900 dark:text-white truncate max-w-[200px]">{{ tx.title }}</p>
                                    <p class="text-sm text-slate-500 dark:text-slate-400 font-mono truncate">{{ tx.subtitle }}</p>
                                </div>
                            </div>
                            <div class="text-right space-y-1">
                                <p class="font-black text-slate-900 dark:text-white">{{ getTransactionAmount(tx) }}</p>
                                <span class="px-3 py-1 rounded-full text-xs font-bold" :class="getStatusClasses(tx.status)">
                                    {{ tx.status }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-center py-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                        <svg class="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p class="text-lg font-bold text-slate-500 dark:text-slate-400">No transactions found</p>
                        <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">for {{ selectedAsset.symbol }}</p>
                    </div>
                </div>

                <!-- Asset Info Card -->
                <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg p-8">
                    <h3 class="text-2xl font-bold text-slate-900 dark:text-white mb-6">Asset Details</h3>
                    <div class="space-y-4">
                        <div class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Symbol</span>
                            <span class="font-mono font-bold text-slate-900 dark:text-white">{{ selectedAsset.symbol }}</span>
                        </div>
                        <div class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Type</span>
                            <span class="font-bold text-indigo-600 dark:text-indigo-400 capitalize">{{ selectedAsset.type || 'N/A' }}</span>
                        </div>
                        <div class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Raw Balance</span>
                            <span class="font-mono text-slate-900 dark:text-white">{{ Number(selectedAsset.balance).toLocaleString() }}</span>
                        </div>
                        <div class="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                            <span class="text-slate-600 dark:text-slate-400">Network</span>
                            <span class="font-bold uppercase text-slate-900 dark:text-white">{{ selectedAsset.network || 'testnet' }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- In your debug panel template -->
            <div v-if="isDebugOpen" class="bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden">
                <!-- ... existing header ... -->
                <div class="font-mono text-xs space-y-2 p-6 max-h-96 overflow-y-auto">
                    <!-- Route Debug -->
                    <div class="text-yellow-400">
                        <span class="text-slate-400">[ROUTE DEBUG]</span> Full URL: {{ route.fullPath }}
                    </div>
                    <div class="text-yellow-400">
                        <span class="text-slate-400">[ROUTE DEBUG]</span> Path: {{ route.path }}
                    </div>
                    <div class="text-yellow-400">
                        <span class="text-slate-400">[ROUTE DEBUG]</span> Params object: {{ JSON.stringify(route.params) }}
                    </div>
                    <div class="text-emerald-400">
                        <span class="text-slate-400">[SYMBOL]</span> Cleaned param: "{{ symbolParam }}"
                    </div>

                    <!-- What links should look like -->
                    <div class="text-blue-400 mt-4">
                        <span class="text-slate-400">[HELP]</span> Test these URLs:
                    </div>
                    <div class="ml-4 text-slate-300 space-y-1">
                        <div>/wallet/asset/DASH</div>
                        <div>/wallet/asset/CREDITS</div>
                        <div>/wallet/asset/tDUSD</div>
                        <div>/wallet/asset/tSANS</div>
                    </div>

                    <!-- Store Asset List -->
                    <div class="mt-4">
                        <div class="text-slate-400">All assets in store:</div>
                        <div v-for="(asset, index) in Wallet.assets" :key="asset.id"
                            :class="[asset.symbol.toUpperCase() === symbolParam ? 'text-emerald-400' : 'text-slate-300']"
                            class="ml-4 flex items-center gap-2">
                            <span>{{ index + 1 }}.</span>
                            <span class="font-bold">{{ asset.symbol }}</span>
                            <span class="text-slate-500">({{ asset.name }})</span>
                            <span class="text-slate-600">→</span>
                            <span class="font-mono">{{ Number(asset.balance).toLocaleString() }}</span>
                            <span v-if="asset.symbol.toUpperCase() === symbolParam" class="bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded text-xs">MATCH</span>
                        </div>
                        <div v-if="Wallet.assets.length === 0" class="ml-4 text-red-400 italic">
                            Store.assets array is empty!
                        </div>
                    </div>

                    <!-- Current Match Debug -->
                    <div class="mt-4 pt-4 border-t border-slate-800">
                        <div class="text-slate-400">Current match debug:</div>
                        <div class="ml-4">
                            <div>Target: "{{ symbolParam }}"</div>
                            <div>Found: {{ selectedAsset ? selectedAsset.symbol : 'None' }}</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Debug Toggle Button (if not already open) -->
            <button v-if="!isDebugOpen" @click="isDebugOpen = true"
                class="w-full py-3 bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-widest rounded-xl border border-slate-700 hover:border-slate-600 transition-colors">
                Show Debug Console
            </button>
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import { useNetwork } from '@/composables/useNetwork'
import { DUSD_DECIMAL_PLACES, SANS_DECIMAL_PLACES } from '@/constants'

const route = useRoute()
const router = useRouter()
const Wallet = useWalletStore()
const { ensure } = useNetwork()

const isDebugOpen = ref(false)
const debugLogs = ref<string[]>([])

const symbolParam = computed(() => {
    const s = route.params.symbol

    // Handle undefined/null
    if (!s) return ''

    // Handle array case
    if (Array.isArray(s)) {
        return (s[0] || '').toUpperCase()
    }

    // Handle string case
    return s.toUpperCase()
})

const selectedAsset = computed(() => {
    // First, let's see what we're looking for
    const targetSymbol = symbolParam.value
    console.log('🔍 Looking for symbol:', targetSymbol)

    // Try direct match first
    const directMatch = Wallet.assets.find(a => a.symbol.toUpperCase() === targetSymbol)
    if (directMatch) {
        console.log('✅ Found direct match:', directMatch)
        return directMatch
    }

    // Try case-insensitive match without 't' prefix
    const withoutPrefix = targetSymbol.replace(/^T/i, '')
    console.log('🔍 Trying without prefix:', withoutPrefix)

    const prefixMatch = Wallet.assets.find(a =>
        a.symbol.toUpperCase() === withoutPrefix ||
        a.symbol.replace(/^T/i, '').toUpperCase() === withoutPrefix
    )

    if (prefixMatch) {
        console.log('✅ Found match after prefix removal:', prefixMatch)
        return prefixMatch
    }

    console.log('❌ No match found')
    return null
})

const availableSymbols = computed(() => {
    return Wallet.assets.map(a => `${a.symbol} (${a.name})`).join(', ')
})

const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    debugLogs.value.push(`[${timestamp}] ${message}`)
}

const clearDebugLogs = () => {
    debugLogs.value = []
}

const toggleDebug = () => {
    isDebugOpen.value = !isDebugOpen.value
    if (isDebugOpen.value) {
        addDebugLog(`=== Asset Details Debug Loaded ===`)
        addDebugLog(`Route param: ${symbolParam.value}`)
        addDebugLog(`Store has ${Wallet.assets.length} assets`)
        addDebugLog(`Store network: ${Wallet.network}`)
        addDebugLog(`Selected asset: ${selectedAsset.value ? selectedAsset.value.symbol : 'None'}`)
    }
}

// --- Balance Display Logic (Copied from Overview) ---
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

const getIconSrc = (symbol: string) => {
    const lower = symbol.toLowerCase()
    const cleanSymbol = lower.startsWith('t') ? lower.substring(1) : lower
    return cleanSymbol === 'credits' ? '/icons/dash.svg' : `/icons/${cleanSymbol}.svg`
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0)
}

const getTransactionAmount = (tx: any) => {
    if (!tx) return '0.00'
    const symbol = tx.assetSymbol || 'CREDITS'
    const amount = Number(tx.amount) || 0

    if (symbol.toLowerCase().includes('credit') || tx.type === 'IDENTITY_CREDIT_TRANSFER') {
        return (amount / 100_000_000_000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })
    }

    return tx.amountFormatted || amount.toLocaleString()
}

const filteredTransactions = computed(() => {
    if (!selectedAsset.value) return []
    const sym = selectedAsset.value.symbol.toUpperCase()
    return (Wallet.transactions || []).filter(tx =>
        (tx.assetSymbol || '').toUpperCase() === sym ||
        (tx.title || '').toUpperCase().includes(sym) ||
        (tx.type || '').includes(sym)
    )
})

const getStatusClasses = (status: string) => {
    switch (status) {
        case 'Completed': return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
        case 'Pending...': return 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse'
        case 'Failed': return 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
        default: return 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
    }
}

onMounted(async () => {
    console.log('🔍 Route params:', route.params)
    console.log('🔍 Full route:', route)

    try {
        const currentNetwork = await ensure()
        addDebugLog(`Network initialized: ${currentNetwork}`)

        addDebugLog(`Current assets in store: ${JSON.stringify(Wallet.assets.map(a => ({
            symbol: a.symbol,
            name: a.name
        })))}`)

        if (Wallet.assets.length === 0) {
            addDebugLog(`Store empty, calling refreshBalances...`)
            await Wallet.refreshBalances(currentNetwork)
            addDebugLog(`Refresh complete. Now have ${Wallet.assets.length} assets`)
        }

    } catch (err) {
        console.error('Failed to load asset details:', err)
        addDebugLog(`ERROR: ${(err as Error).message}`)
    }
})

// Watch for route parameter changes
watch(() => route.params.symbol, (newSymbol) => {
    console.log('🔄 Route symbol changed:', newSymbol)
    addDebugLog(`Route symbol changed to: ${newSymbol}`)
    console.log('Current assets:', Wallet.assets.map(a => a.symbol))
}, { immediate: true })
</script>
