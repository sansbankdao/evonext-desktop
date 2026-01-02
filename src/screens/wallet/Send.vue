<!-- src/screens/Send.vue -->
<template>
    <main class="max-w-2xl mx-auto p-4">
        <header class="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-3">
                <svg class="w-8 h-8 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
                </svg>

                <h1 class="text-3xl font-bold text-slate-100">
                    Send Assets
                </h1>
            </div>

            <button @click="router.back()" class="flex items-center gap-1 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>

                Back to Wallet
            </button>
        </header>

        <form @submit.prevent="handleSend" class="bg-white dark:bg-slate-800/80 backdrop-blur-sm p-6 rounded-xl space-y-6 shadow-lg border border-slate-200 dark:border-slate-700">
            <!-- Currency Selection -->
            <div>
                <label for="currency" class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <svg class="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                    </svg>
                    Currency to Send
                </label>

                <select
                    id="currency"
                    v-model="selectedCurrency"
                    class="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                    <option value="dash-coins">Dash Coins (DASH)</option>
                    <option value="dash-credits">Dash Credits (CREDITS)</option>
                    <option value="dusd">Dash USD (DUSD)</option>
                    <option value="sans">Sansnote (SANS)</option>
                </select>

                <div v-if="selectedAsset" class="mt-3 p-3 bg-emerald-50 dark:bg-slate-700/50 rounded-lg">
                    <p class="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <svg class="w-4 h-4 text-emerald-500 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                        </svg>
                        Available Balance: {{ selectedAsset.balance.toLocaleString() }} {{ selectedAsset.symbol }}
                    </p>
                </div>

                <p v-else class="text-sm text-amber-600 dark:text-amber-400 mt-2">
                    No balance available for this currency.
                </p>
            </div>

            <!-- Recipient Address -->
            <div>
                <label for="recipient" class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <svg class="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Recipient Address or Identity
                </label>

                <div class="relative">
                    <input
                        id="recipient"
                        v-model="recipient"
                        type="text"
                        placeholder="Enter Dash identity or address"
                        class="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 pl-10 text-slate-900 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 pr-10"
                        required
                    />

                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                </div>
            </div>

            <!-- Amount -->
            <div>
                <label for="amount" class="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <svg class="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>
                    Amount to Send
                </label>

                <div class="relative">
                    <input
                        id="amount"
                        v-model="amount"
                        type="number"
                        step="any"
                        placeholder="0.0"
                        class="w-full bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-3 pl-10 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 pr-20"
                        required
                    />

                    <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"></path>
                    </svg>

                    <button
                        type="button"
                        @click="setMaxAmount"
                        :disabled="!selectedAsset || selectedAsset.balance <= 0"
                        class="absolute right-2 top-1/2 transform -translate-y-1/2 px-2 py-1 bg-indigo-500/20 dark:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded hover:bg-indigo-500/30 dark:hover:bg-indigo-400/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        MAX
                    </button>
                </div>

                <p v-if="selectedAsset && amount" class="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    (Max: {{ selectedAsset.balance.toLocaleString() }} {{ selectedAsset.symbol }})
                </p>
            </div>

            <!-- Error Message -->
            <div v-if="error" class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm p-3 rounded-lg flex items-start gap-2">
                <svg class="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                {{ error }}
            </div>

            <!-- Transaction Preview -->
            <div v-if="isFormValid && selectedAsset && amount" class="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg space-y-2 border border-indigo-200 dark:border-indigo-800">
                <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Transaction Preview
                </h3>

                <div class="text-xs space-y-1 text-slate-600 dark:text-slate-400">
                    <p>
                        Send {{ amount.toLocaleString() }} {{ selectedAsset.symbol }} to {{ recipient.slice(0, 20) }}...
                    </p>

                    <p>
                        Network fee: ~0.00001 DASH (estimated)
                    </p>

                    <p class="text-slate-500 dark:text-slate-500">
                        Review details before confirming.
                    </p>
                </div>
            </div>

            <!-- Submit Button -->
            <button
                type="submit"
                :disabled="isSending || !isFormValid || !selectedAsset"
                class="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg
                       hover:from-indigo-500 hover:to-purple-500 hover:shadow-indigo-500/25
                       disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed disabled:text-slate-600 disabled:shadow-none"
            >
                <svg v-if="isSending" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>

                <span>
                    {{ isSending ? 'Processing Transaction...' : 'Review & Send' }}
                </span>
            </button>
        </form>
    </main>
</template>

<script setup lang="ts">
/* Import modules. */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// MIGRATED: Use composables instead of store/libs
import { useWallet } from '@/composables/useWallet'
import { useIdentity } from '@/composables/useIdentity'

import {
    getDUSDContractId,
    getSANSContractId,
    DUSD_DECIMAL_PLACES,
    SANS_DECIMAL_PLACES,
} from '@/constants'

const router = useRouter()

// Initialize composables
const wallet = useWallet()
const identity = useIdentity()

const recipient = ref('')
const amount = ref<number | null>(null)
const selectedCurrency = ref('dash-coins')

const isSending = ref(false)
const error = ref<string | null>(null)

// REFACTORED: Use composable's findAsset helper
const selectedAsset = computed(() => {
    const tickerMap: Record<string, string> = {
        'dash-coins': 'DASH',
        'dash-credits': 'CREDITS',
        'dusd': 'DUSD',
        'sans': 'SANS'
    }

    const ticker = tickerMap[selectedCurrency.value] || ''

    // Use wallet.findAsset from composable
    return wallet.findAsset(ticker)
})

const isFormValid = computed(() => {
    return !!selectedAsset.value && recipient.value.trim() !== '' && amount.value && amount.value > 0
})

const setMaxAmount = () => {
    if (selectedAsset.value && selectedAsset.value.balance) {
        amount.value = selectedAsset.value.balance
    }
}

onMounted(async () => {
    // Ensure wallet is initialized and data is fresh
    await wallet.initialize()
    // Optionally refresh balances immediately
    await wallet.refresh()
})

const handleSend = async () => {
    if (!isFormValid.value || !selectedAsset.value) {
        error.value = 'Please complete the form with valid details.'
        return
    }

    if (amount.value! > selectedAsset.value.balance) {
        error.value = 'Insufficient balance for this transaction.'
        return
    }

    isSending.value = true
    error.value = null

    try {
        // REFACTORED: Use identity composable for ID and Index
        const identityId = identity.identityId.value
        if (!identityId) {
            throw new Error('No identity found. Please connect your wallet.')
        }

        // REFACTORED: Get index from identity composable
        const identityIdx = await identity.getIdentityIdx()

        console.log(`Sending ${amount.value} ${selectedAsset.value.symbol} to ${recipient.value}`)

        if (selectedAsset.value.symbol === 'CREDITS' && amount.value) {
            /* Calculate credits. */
            const credits = BigInt(Math.floor(amount.value * 100_000_000_000))
            console.log('CALCULATED CREDITS', credits)
            console.log('IDENTITY ID', identityId)
            console.log('IDENTITY IDX', identityIdx)

            // MIGRATED: use wallet composable
            const result = await wallet.sendCredit(
                identityId, identityIdx, recipient.value, credits
            )

            console.log('Send Credit Result:', result)

            /* Validate result. */
            if (result.success && result.data?.txid) {
                alert('Transaction Successful -- Your TXID is:\n' + result.data.txid)
            } else if (result.error) {
                throw new Error(result.error.message)
            }
        } else if (['SANS', 'DUSD'].includes(selectedAsset.value.symbol) && amount.value) {
            /* Get token contract ID based on network and ticker. */
            let tokenId: string
            let decimalPlaces: number

            if (selectedAsset.value.symbol === 'DUSD') {
                tokenId = getDUSDContractId()
                decimalPlaces = DUSD_DECIMAL_PLACES
            } else {
                tokenId = getSANSContractId()
                decimalPlaces = SANS_DECIMAL_PLACES
            }

            /* Calculate atomic units using correct decimal places. */
            const atomicUnits = BigInt(Math.floor(amount.value * (10 ** decimalPlaces)))

            console.log('TOKEN CONTRACT ID', tokenId)
            console.log('DECIMAL PLACES', decimalPlaces)
            console.log('CALCULATED ATOMIC UNITS', atomicUnits)

            // MIGRATED: use wallet composable
            const result = await wallet.sendTokenTransfer(
                identityId,
                identityIdx,
                tokenId,
                recipient.value,
                atomicUnits
            )

            console.log('Send Token Result:', result)

            /* Validate result. */
            if (result.success && result.data?.txid) {
                alert('Transaction Successful -- Your TXID is:\n' + result.data.txid)
            } else if (result.error) {
                throw new Error(result.error.message)
            }
        } else {
            // Logic for other currencies (e.g. DASH native coins) goes here
            console.log(`${selectedAsset.value.symbol} sending logic pending implementation.`)
            await new Promise(resolve => setTimeout(resolve, 2000))
        }

        router.push('/wallet')

    } catch (e: any) {
        console.error('Failed to send transaction:', e)
        error.value = e.message || 'An unknown error occurred during the transaction.'
    } finally {
        isSending.value = false
    }
}
</script>
