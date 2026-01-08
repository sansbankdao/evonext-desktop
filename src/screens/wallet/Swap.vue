<!-- src/screens/Swap.vue -->
<template>
    <main class="max-w-md mx-auto">
        <header class="flex items-center justify-between mb-8">
            <h1 class="text-3xl font-bold text-slate-900 dark:text-slate-100">
                Swap Assets
            </h1>
            <button @click="router.back()" class="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                &larr; Back to Wallet
            </button>
        </header>

        <div class="bg-white dark:bg-slate-800 p-4 rounded-xl space-y-2">
            <!-- From Asset -->
            <div class="bg-slate-50/50 dark:bg-slate-900/70 p-4 rounded-lg">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm text-slate-600 dark:text-slate-400">You Pay</span>
                    <span class="text-sm text-slate-600 dark:text-slate-400">
                        Balance: {{ fromAsset?.balance?.toLocaleString() ?? 0 }}
                    </span>
                </div>
                <div class="flex items-center gap-4">
                    <input
                        type="number"
                        v-model="fromAmount"
                        @input="calculateToAmount"
                        placeholder="0.0"
                        class="w-full bg-transparent text-2xl text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                    <select v-model="fromAssetTicker" class="bg-slate-100 dark:bg-slate-700 border-none rounded-lg p-2 text-slate-900 dark:text-slate-100 font-semibold">
                        <option v-for="asset in Wallet.assets" :key="asset.symbol" :value="asset.symbol">
                            {{ asset.symbol }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Swap Direction Button -->
            <div class="flex justify-center py-2">
                <button @click="flipAssets" class="p-2 bg-slate-200 dark:bg-slate-700 rounded-full hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-600 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M7 16V4m0 12l-4-4m4 4l4-4m6 8v-12m0 12l-4-4m4 4l4-4" />
                    </svg>
                </button>
            </div>

            <!-- To Asset -->
            <div class="bg-slate-50/50 dark:bg-slate-900/70 p-4 rounded-lg">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-sm text-slate-600 dark:text-slate-400">You Receive</span>
                     <span class="text-sm text-slate-600 dark:text-slate-400">
                        Balance: {{ toAsset?.balance?.toLocaleString() ?? 0 }}
                    </span>
                </div>
                <div class="flex items-center gap-4">
                    <input
                        type="number"
                        v-model="toAmount"
                        @input="calculateFromAmount"
                        placeholder="0.0"
                        class="w-full bg-transparent text-2xl text-slate-900 dark:text-slate-100 focus:outline-none"
                    />
                    <select v-model="toAssetTicker" class="bg-slate-100 dark:bg-slate-700 border-none rounded-lg p-2 text-slate-900 dark:text-slate-100 font-semibold">
                        <option v-for="asset in availableToAssets" :key="asset.symbol" :value="asset.symbol">
                            {{ asset.symbol }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Exchange Rate Info -->
            <div v-if="exchangeRate" class="text-center text-sm text-slate-600 dark:text-slate-400 pt-4">
                1 {{ fromAssetTicker }} ≈ {{ exchangeRate.toFixed(4) }} {{ toAssetTicker }}
            </div>

            <!-- Error Message -->
            <div v-if="error" class="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-sm p-3 rounded-lg mt-4">
                {{ error }}
            </div>

            <!-- Submit Button -->
            <button
                @click="handleSwap"
                :disabled="isSubmitting || !isFormValid"
                class="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors mt-4
                       hover:bg-indigo-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
                {{ isSubmitting ? 'Processing...' : 'Swap' }}
            </button>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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
const fromAssetTicker = ref(Wallet.assets[0]?.symbol ?? '')
const toAssetTicker = ref(Wallet.assets[1]?.symbol ?? '')
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

// --- Watchers for asset selection ---
watch(fromAssetTicker, (newTicker) => {
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
    } else {
        toAmount.value = null
    }
    validateBalance()
}

const calculateFromAmount = () => {
    if (toAmount.value && exchangeRate.value > 0) {
        fromAmount.value = parseFloat((toAmount.value / exchangeRate.value).toFixed(6))
    } else {
        fromAmount.value = null
    }
    validateBalance()
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

    calculateToAmount() // Recalculate based on new direction
}

const handleSwap = async () => {
    if (!isFormValid.value) return
    isSubmitting.value = true
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log(`Swapped ${fromAmount.value} ${fromAssetTicker.value} for ${toAmount.value} ${toAssetTicker.value}`)
        alert('Swap successful!') // Replace with toast notification
        router.push('/wallet')
    } catch (e: any) {
        error.value = e.message || 'Swap failed.'
    } finally {
        isSubmitting.value = false
    }
}
</script>
