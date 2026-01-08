<!-- src/screens/wallet/Swap.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'

const router = useRouter()
const Wallet = useWalletStore()

// --- Mock Exchange Rates ---
const rates: Record<string, number> = {
    'DASH_DUSD': 24.50, 'DUSD_DASH': 1 / 24.50,
    'DASH_SANS': 95.80, 'SANS_DASH': 1 / 95.80,
    'DUSD_SANS': 3.91, 'SANS_DUSD': 1 / 3.91,
}

// --- Component State ---
const fromAssetTicker = ref(Wallet.assets[0]?.symbol ?? 'DASH')
const toAssetTicker = ref(Wallet.assets[1]?.symbol ?? 'DUSD')
const fromAmount = ref<number | null>(null)
const toAmount = ref<number | null>(null)
const isSubmitting = ref(false)
const error = ref<string | null>(null)

// --- Computed Properties ---
const fromAsset = computed(() => Wallet.getAssetByTicker(fromAssetTicker.value))
const toAsset = computed(() => Wallet.getAssetByTicker(toAssetTicker.value))

const availableToAssets = computed(() => Wallet.assets.filter(a => a.symbol !== fromAssetTicker.value))

const exchangeRate = computed(() => {
    if (!fromAssetTicker.value || !toAssetTicker.value) return 0
    return rates[`${fromAssetTicker.value}_${toAssetTicker.value}`] ?? 0
})

const isFormValid = computed(() => {
    return fromAmount.value && fromAmount.value > 0 && !error.value
})

const rateDisplay = computed(() => {
    if (exchangeRate.value > 0) {
        return `1 ${fromAssetTicker.value} ≈ ${exchangeRate.value.toFixed(6)} ${toAssetTicker.value}`
    }
    return 'Select assets to view rate'
})

// --- Watchers for asset selection ---
watch(fromAssetTicker, (newTicker) => {
    // Ensure we don't have same assets selected
    if (newTicker === toAssetTicker.value) {
        toAssetTicker.value = availableToAssets.value[0]?.symbol ?? ''
    }
    calculateToAmount()
})

watch(toAssetTicker, () => {
    calculateToAmount()
})

// --- Core Logic Functions ---
const calculateToAmount = () => {
    if (fromAmount.value && exchangeRate.value > 0) {
        toAmount.value = parseFloat((fromAmount.value * exchangeRate.value).toFixed(6))
        validateBalance()
    } else {
        toAmount.value = null
        error.value = null
    }
}

const calculateFromAmount = () => {
    if (toAmount.value && exchangeRate.value > 0) {
        fromAmount.value = parseFloat((toAmount.value / exchangeRate.value).toFixed(6))
        validateBalance()
    } else {
        fromAmount.value = null
        error.value = null
    }
}

const validateBalance = () => {
    if (fromAsset.value && fromAmount.value && fromAmount.value > (fromAsset.value.balance as number)) {
        error.value = `Insufficient ${fromAsset.value.symbol} balance.`
    } else {
        error.value = null
    }
}

const flipAssets = () => {
    const tempTicker = fromAssetTicker.value
    fromAssetTicker.value = toAssetTicker.value
    toAssetTicker.value = tempTicker

    const tempAmount = fromAmount.value
    fromAmount.value = toAmount.value
    toAmount.value = tempAmount

    calculateToAmount()
}

const handleSwap = async () => {
    if (!isFormValid.value) return
    isSubmitting.value = true
    error.value = null
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log(`Swapped ${fromAmount.value} ${fromAssetTicker.value} for ${toAmount.value} ${toAssetTicker.value}`)
        alert('Swap successful!')
        router.push('/wallet')
    } catch (e: any) {
        error.value = e.message || 'Swap failed.'
    } finally {
        isSubmitting.value = false
    }
}

onMounted(async () => {
    // Initialize default selection if needed
    if (Wallet.assets.length > 0 && !fromAssetTicker.value) {
        fromAssetTicker.value = Wallet.assets[0]?.symbol || ''
    }
    if (Wallet.assets.length > 1 && !toAssetTicker.value) {
        toAssetTicker.value = Wallet.assets[1]?.symbol || ''
    }
})
</script>

<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-slate-50 dark:bg-slate-950">

        <!-- Navigation Header -->
        <header class="w-full max-w-5xl flex items-center justify-between px-6 py-6">
            <button
                @click="router.back()"
                class="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors font-medium"
            >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Wallet</span>
            </button>

            <div class="flex items-center gap-4">
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
                        Active
                    </span>
                </div>
            </div>
        </header>

        <!-- Main Content -->
        <div class="w-full max-w-5xl px-6 pb-12">

            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">

                <div class="p-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        Swap Assets
                    </h1>
                    <p class="text-slate-500 dark:text-slate-400 text-sm">
                        Exchange Dash Platform assets instantly.
                    </p>
                </div>

                <div class="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

                    <!-- LEFT COLUMN: Swap Input (Span 7) -->
                    <div class="lg:col-span-7 flex flex-col space-y-4">

                        <!-- From Asset Card -->
                        <div class="relative p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                            <div class="flex justify-between items-start mb-4">
                                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    You Pay
                                </label>
                                <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Bal: {{ fromAsset?.balance?.toLocaleString(undefined, {maximumFractionDigits: 4}) ?? 0 }}
                                </span>
                            </div>
                            <div class="flex items-center justify-between gap-4">
                                <input
                                    type="number"
                                    v-model="fromAmount"
                                    @input="calculateToAmount"
                                    placeholder="0.00"
                                    class="w-full bg-transparent text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none"
                                />
                                <div class="relative group">
                                    <select
                                        v-model="fromAssetTicker"
                                        class="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl pl-3 pr-8 py-2 font-bold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <option v-for="asset in Wallet.assets" :key="asset.symbol" :value="asset.symbol">
                                            {{ asset.symbol }}
                                        </option>
                                    </select>
                                    <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Swap Switcher -->
                        <div class="relative flex items-center justify-center -my-2">
                            <div class="absolute w-full h-px bg-slate-200 dark:bg-slate-800 z-0"></div>
                            <button
                                @click="flipAssets"
                                class="relative z-10 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm hover:shadow-md hover:scale-110 active:scale-95 transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            >
                                <svg class="w-5 h-5 transition-transform duration-300" :class="{ 'rotate-180': false }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 12l-4-4m4 4l4-4m6 8v-12m0 12l-4-4m4 4l4-4" />
                                </svg>
                            </button>
                        </div>

                        <!-- To Asset Card -->
                        <div class="relative p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                            <div class="flex justify-between items-start mb-4">
                                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    You Receive
                                </label>
                                <span class="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Bal: {{ toAsset?.balance?.toLocaleString(undefined, {maximumFractionDigits: 4}) ?? 0 }}
                                </span>
                            </div>
                            <div class="flex items-center justify-between gap-4">
                                <input
                                    type="number"
                                    v-model="toAmount"
                                    @input="calculateFromAmount"
                                    placeholder="0.00"
                                    class="w-full bg-transparent text-3xl font-bold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 focus:outline-none"
                                />
                                <div class="relative group">
                                    <select
                                        v-model="toAssetTicker"
                                        class="appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl pl-3 pr-8 py-2 font-bold text-slate-900 dark:text-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                    >
                                        <option v-for="asset in availableToAssets" :key="asset.symbol" :value="asset.symbol">
                                            {{ asset.symbol }}
                                        </option>
                                    </select>
                                    <div class="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                        <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Error Message -->
                        <div v-if="error" class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl flex items-center gap-3">
                            <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {{ error }}
                        </div>

                    </div>

                    <!-- RIGHT COLUMN: Details & Action (Span 5) -->
                    <div class="lg:col-span-5 flex flex-col space-y-6">

                        <!-- Exchange Rate Display -->
                        <div class="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Exchange Rate
                            </p>
                            <div class="text-sm font-medium text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                                {{ rateDisplay }}
                            </div>
                        </div>

                        <!-- Transaction Summary -->
                        <div class="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 space-y-3">
                            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">
                                Transaction Summary
                            </h3>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-slate-500 dark:text-slate-400">Network Fee</span>
                                    <span class="font-medium text-slate-900 dark:text-white">
                                        ~0.00001 DASH
                                    </span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500 dark:text-slate-400">Slippage</span>
                                    <span class="font-medium text-slate-900 dark:text-white">
                                        &lt; 0.01%
                                    </span>
                                </div>
                                <div class="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-500 dark:text-slate-400">Est. Time</span>
                                    <span class="font-medium text-slate-900 dark:text-white">
                                        &lt; 2 min
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Spacer -->
                        <div class="flex-1"></div>

                        <!-- Submit Button -->
                        <button
                            @click="handleSwap"
                            :disabled="isSubmitting || !isFormValid"
                            class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                        >
                            <svg v-if="isSubmitting" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{{ isSubmitting ? 'Processing...' : 'Swap Assets' }}</span>
                        </button>

                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
