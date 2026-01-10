<!-- src/screens/wallet/Send.vue -->
<script setup lang="ts">
/* Import modules. */
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWallet } from '@/composables/useWallet'
import { useIdentity } from '@/composables/useIdentity'
import { useKeyManagement } from '@/composables/useKeyManagement'
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
const keyMgr = useKeyManagement()
const recipient = ref('')
const amount = ref<number | null>(null)
const selectedCurrency = ref('dash-coins')
const isSending = ref(false)
const error = ref<string | null>(null)
// Debugging State
const isDebugOpen = ref(false)
const debugLogs = ref<string[]>([])
const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    debugLogs.value.push(`[${timestamp}] ${message}`)
    // Auto-scroll to bottom
    setTimeout(() => {
        const el = document.getElementById('debug-terminal')
        if (el) el.scrollTop = el.scrollHeight
    }, 10)
}
// Helper to determine search symbols based on network/currency
const getSearchSymbols = (currency: string): string[] => {
    if (currency === 'dusd') return ['tDUSD', 'DUSD']
    if (currency === 'sans') return ['tSANS', 'SANS']
    return []
}
// REFACTORED: Handle Testnet Prefixes (tDUSD, tSANS)
const selectedAsset = computed(() => {
    const tickerMap: Record<string, string> = {
        'dash-coins': 'DASH',
        'dash-credits': 'CREDITS',
        'dusd': 'DUSD',
        'sans': 'SANS'
    }
    const baseTicker = tickerMap[selectedCurrency.value] || ''
    // Handle Token Search (do not use wallet.findAsset strictly to allow fallback)
    if (['dusd', 'sans'].includes(selectedCurrency.value)) {
        const searchSymbols = getSearchSymbols(selectedCurrency.value)
        const asset = wallet.assets.value.find((a: any) =>
            searchSymbols.includes(a.symbol)
        )
        return asset || null
    }
    // Handle Native Search (DASH or CREDITS)
    // Use the store getter, or fallback to manual find for safety
    return wallet.findAsset(baseTicker)
})
// REFACTORED: Normalized balance logic for UI display
const displayBalance = computed(() => {
    const asset = selectedAsset.value
    if (!asset || asset.balance === undefined || asset.balance === null) {
        return '0.00'
    }
    // If the selected currency is Credits, divide by 100 billion to show full Dash value
    if (selectedCurrency.value === 'dash-credits') {
        // Convert balance to number, divide by 100 billion, and format
        const numericBalance = Number(asset.balance)
        const fullDashBalance = numericBalance / 100_000_000_000
        // Format with up to 8 decimal places to ensure decimals is visible (like Dash)
        return fullDashBalance.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        })
    }
    // For other assets, just use the existing balance value and formatting
    // Remove commas if they exist in the raw string, parse as float, then re-format
    const numericBalance = typeof asset.balance === 'string'
        ? parseFloat(asset.balance.replace(/,/g, ''))
        : Number(asset.balance)
    return numericBalance.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8
    })
})
// REFACTORED: Normalized label logic for UI display
const displayLabel = computed(() => {
    const asset = selectedAsset.value
    if (!asset) return '---'
    if (selectedCurrency.value === 'dash-credits') {
        return 'DASH CREDITS'
    }
    // Strip testnet 't' prefix for cleaner UI
    return asset.symbol.replace(/^t/i, '')
})
const isFormValid = computed(() => {
    const asset = selectedAsset.value
    return !!asset &&
           !!asset.balance &&
           Number(asset.balance) > 0 &&
           recipient.value.trim() !== '' &&
           amount.value && amount.value > 0
})
// REFACTORED: Correctly normalize logic for "Use Max"
const setMaxAmount = () => {
    const asset = selectedAsset.value
    if (!asset || asset.balance === undefined || asset.balance === null || Number(asset.balance) <= 0) {
        return
    }
    const rawBalance = Number(asset.balance)
    if (selectedCurrency.value === 'dash-credits') {
        // Normalize raw credits to Dash equiv (1e11)
        amount.value = rawBalance / 100_000_000_000
    } else {
        // Others (Dash/tokens) are presumed already normalized in store for display
        amount.value = rawBalance
    }
}
onMounted(async () => {
    // Ensure wallet is initialized
    await wallet.initialize()
    // FORCE REFRESH: Ensure we have the latest data when landing on this screen
    // This helps if the store was emptied or updated elsewhere
    try {
        addLog('INIT: Refreshing balances on Send Screen mount...')
        await wallet.refresh()
        addLog(`INIT: Refreshed. Assets: ${wallet.assets.value.length}`)
    } catch (e) {
        addLog(`INIT WARNING: Refresh failed - ${(e as Error)?.message || 'unknown'}`)
    }
})
const handleSend = async () => {
    if (!isFormValid.value || !selectedAsset.value) {
        error.value = 'Please complete the form with valid details.'
        return
    }
    // Normalize symbol (strip testnet 't' for internal logic checks)
    const normSymbol = selectedAsset.value.symbol.replace(/^t/i, '')
    // TEMPORARY FIX FOR USER INPUT:
    // If CREDITS are selected, the user likely expects to input the normalized amount (e.g. 1.54 DASH)
    // but the logic expects raw credits. We multiply the user input by 100 billion if Credits are selected.
    let finalAmount = amount.value
    if (selectedCurrency.value === 'dash-credits' && amount.value) {
        finalAmount = amount.value * 100_000_000_000
    }
    if (finalAmount! > (selectedAsset.value.balance as number)) {
        error.value = 'Insufficient balance for this transaction.'
        return
    }
    isSending.value = true
    error.value = null
    debugLogs.value = [] // Clear previous logs
    try {
        addLog('START: Initiating send process...')
        // REFACTORED: Use identity composable for ID
        const identityId = identity.identityId.value
        if (!identityId) {
            throw new Error('No identity found. Please connect your wallet.')
        }
        addLog(`IDENTITY: Found ID ${identityId}`)
        // =================================================================
        // KEY RETRIEVAL (Consolidated)
        // =================================================================
        addLog('STEP 1: Attempting to retrieve Transfer Key...')
        const wifKey = await keyMgr.getTransferKey(identityId)
        if (!wifKey) {
            throw new Error('Could not find Transfer key (Purpose 3). Please check your identity settings.')
        }
        addLog('KEY: Successfully retrieved WIF Key')
        // Sanitize log slightly to avoid printing full key if logs leak, but we want to see it was found
        addLog(`KEY: First 4 chars: ${wifKey.substring(0, 4)}... Last 4 chars: ...${wifKey.substring(wifKey.length - 4)}`)
        console.log('[Send] Using Transfer Key from consolidated manager')
        // Assuming we need to pass the raw identity index (idx)
        // For a single identity file, index is usually 0.
        const identityIdx = 0
        // =================================================================
        // LOGIC: Send Credits
        // =================================================================
        if (normSymbol === 'CREDITS' && amount.value) {
            addLog('TYPE: Processing CREDIT Transfer...')
            /* Calculate credits. */
            const credits = BigInt(Math.floor(finalAmount || 0))
            addLog(`CALC: Converted amount to credits: ${credits}`)
            const result = await wallet.sendCredit(
                identityId,
                identityIdx,
                recipient.value,
                credits,
                wifKey
            )
            console.log('Send Credit Result:', result)
            addLog('WALLET: Received response from Wallet Composable')
            // Append detailed logs from the composable if they exist
            if (result.debugLog && result.debugLog.length > 0) {
                addLog('--- DETAILED WALLET LOGS ---')
                result.debugLog.forEach(logLine => addLog(logLine))
                addLog('--- END DETAILED LOGS ---')
            }
            if (result.success) {
                const txid = result.data?.txid || 'UNKNOWN'
                addLog(`SUCCESS: Transaction Broadcasted. TXID: ${txid}`)
                alert('Transaction Successful -- Your TXID is:\n' + txid)
                router.push('/wallet') // Go to wallet history
            } else {
                addLog(`FAILURE: Transaction failed. Code: ${result.error?.code}, Msg: ${result.error?.message}`)
                addLog(`STEP FAILURE AT: ${result.error?.step}`)
                throw new Error(result.error?.message || 'Unknown Transaction Error')
            }
        }
        // =================================================================
        // LOGIC: Send Tokens (DUSD/SANS)
        // =================================================================
        else if (['SANS', 'DUSD'].includes(normSymbol) && amount.value) {
            addLog(`TYPE: Processing ${normSymbol} Token Transfer...`)
            /* Get token contract ID based on network and ticker. */
            let tokenId: string
            let decimalPlaces: number
            if (normSymbol === 'DUSD') {
                tokenId = getDUSDContractId()
                decimalPlaces = DUSD_DECIMAL_PLACES
            } else {
                tokenId = getSANSContractId()
                decimalPlaces = SANS_DECIMAL_PLACES
            }
            addLog(`TOKEN: Contract ID: ${tokenId}`)
            /* Calculate atomic units using correct decimal places. */
            const atomicUnits = BigInt(Math.floor(amount.value * (10 ** decimalPlaces)))
            addLog(`CALC: Converted amount to atomic units: ${atomicUnits}`)
            // MIGRATED: use wallet composable
            const result = await wallet.sendTokenTransfer(
                identityId,
                identityIdx,
                tokenId,
                recipient.value,
                atomicUnits,
                wifKey
            )
            console.log('Send Token Result:', result)
            console.log('FULL Token Result:', JSON.stringify(result, null, 2))  // ADD FULL LOG
            addLog(`FULL RESULT JSON: ${JSON.stringify(result, null, 2)}`)     // ADD FULL LOG
            addLog('RESULT: Received response from Wallet Composable')
            // Append detailed logs
            if (result.debugLog && result.debugLog.length > 0) {
                result.debugLog.forEach(logLine => addLog(logLine))
            }
            /* Validate result. */
            if (result.success) {
                const txid = result.data?.txid || 'UNKNOWN'
                addLog(`SUCCESS: Transaction Broadcasted. TXID: ${txid}`)
                alert('Transaction Successful -- Your TXID is:\n' + txid)
                router.push('/wallet')
            } else {
                addLog(`FAILURE: Transaction failed. Code: ${result.error?.code}, Msg: ${result.error?.message}`)
                addLog(`STEP FAILURE AT: ${result.error?.step}`)
                throw new Error(result.error?.message || 'Unknown Transaction Error')
            }
        } else {
            // Logic for other currencies (e.g. DASH native coins) goes here
            throw new Error(`Sending logic for ${normSymbol} is pending implementation.`)
        }
    } catch (e: any) {
        console.error('Failed to send transaction:', e)
        error.value = e.message || 'An unknown error occurred during the transaction.'
        addLog(`CATCH: Unhandled Exception - ${error.value}`)
        isSending.value = false // Ensure sending state is reset on error
    } finally {
        isSending.value = false
        addLog('END: Process finished.')
    }
}
</script>
<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-slate-50 dark:bg-slate-950 pb-24">
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
                        Testnet
                    </span>
                </div>
            </div>
        </header>
        <!-- Main Content (Wider Layout) -->
        <div class="w-full max-w-5xl px-6">
            <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div class="p-8 pb-6 border-b border-slate-200 dark:border-slate-800">
                    <h1 class="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                        Send Assets
                    </h1>
                    <p class="text-slate-500 dark:text-slate-400 text-sm">
                        Transfer Dash Platform assets to any Identity ID.
                    </p>
                </div>
                <form @submit.prevent="handleSend" class="p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <!-- LEFT COLUMN: Form Controls (Span 7) -->
                    <div class="lg:col-span-7 space-y-6">
                        <!-- Asset Selection -->
                        <div class="space-y-3">
                            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                                Select Asset
                            </label>
                            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <button
                                    type="button"
                                    @click="selectedCurrency = 'dash-coins'"
                                    :class="[
                                        'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 text-center',
                                        selectedCurrency === 'dash-coins'
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500 ring-1 ring-blue-500'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                    ]"
                                >
                                    <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <svg class="w-4 h-4 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
                                    </div>
                                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">DASH</span>
                                </button>
                                <button
                                    type="button"
                                    @click="selectedCurrency = 'dash-credits'"
                                    :class="[
                                        'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 text-center',
                                        selectedCurrency === 'dash-credits'
                                            ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 dark:border-indigo-500 ring-1 ring-indigo-500'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                    ]"
                                >
                                    <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <svg class="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                                    </div>
                                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">CREDITS</span>
                                </button>
                                <button
                                    type="button"
                                    @click="selectedCurrency = 'dusd'"
                                    :class="[
                                        'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 text-center',
                                        selectedCurrency === 'dusd'
                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-500 ring-1 ring-green-500'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                    ]"
                                >
                                    <div class="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center border border-green-200 dark:border-green-800">$</div>
                                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">DUSD</span>
                                </button>
                                <button
                                    type="button"
                                    @click="selectedCurrency = 'sans'"
                                    :class="[
                                        'flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-200 text-center',
                                        selectedCurrency === 'sans'
                                            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 dark:border-purple-500 ring-1 ring-purple-500'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                    ]"
                                >
                                    <div class="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                        <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                    </div>
                                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400">SANS</span>
                                </button>
                            </div>
                        </div>
                        <!-- Recipient -->
                        <div class="space-y-2">
                            <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                                Recipient Identity
                            </label>
                            <div class="relative group/field">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <input
                                    v-model="recipient"
                                    type="text"
                                    placeholder="e.g. yFg..."
                                    class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-900 dark:text-slate-100 font-mono text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors group-hover/field:border-slate-300 dark:group-hover/field:border-slate-700"
                                />
                            </div>
                        </div>
                        <!-- Amount -->
                        <div class="space-y-2">
                            <div class="flex justify-between items-center px-1">
                                <label class="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Amount
                                </label>
                                <button
                                    @click="setMaxAmount"
                                    :disabled="!selectedAsset?.balance || Number(selectedAsset.balance) <= 0"
                                    class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    Use Max
                                </button>
                            </div>
                            <div class="relative group/field">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                    </svg>
                                </div>
                                <input
                                    v-model="amount"
                                    type="number"
                                    step="any"
                                    placeholder="0.00"
                                    class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-10 pr-20 text-slate-900 dark:text-slate-100 font-mono text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors group-hover/field:border-slate-300 dark:group-hover/field:border-slate-700"
                                />
                                <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                    <span class="text-slate-400 text-xs font-mono uppercase">
                                        {{ displayLabel }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <!-- Error Display -->
                        <div v-if="error" class="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm p-3 rounded-xl flex items-start gap-3">
                            <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {{ error }}
                        </div>
                    </div>
                    <!-- RIGHT COLUMN: Summary & Action (Span 5) -->
                    <div class="lg:col-span-5 flex flex-col h-full space-y-6">
                        <!-- Balance Card -->
                        <div class="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                            <p class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                                Available Balance
                            </p>
                            <div class="flex items-baseline gap-1">
                                <span class="text-3xl font-bold text-slate-900 dark:text-white">
                                    {{ displayBalance }}
                                </span>
                                <span class="text-sm font-medium text-slate-500">
                                    {{ displayLabel }}
                                </span>
                            </div>
                        </div>
                        <!-- Preview Card -->
                        <div v-if="isFormValid && selectedAsset && amount" class="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 space-y-4">
                            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <svg class="w-4 h-4 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Transaction Summary
                            </h3>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span class="text-slate-500 dark:text-slate-400">Asset</span>
                                    <span class="font-bold text-slate-900 dark:text-white">{{ displayLabel }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500 dark:text-slate-400">Amount</span>
                                    <span class="font-bold text-slate-900 dark:text-white">{{ amount.toLocaleString() }}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span class="text-slate-500 dark:text-slate-400">Network Fee</span>
                                    <span class="font-bold text-slate-900 dark:text-white">~0.00001</span>
                                </div>
                                <div class="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                                <div class="flex justify-between items-center">
                                    <span class="text-slate-500 dark:text-slate-400">To</span>
                                    <span class="font-mono text-xs text-indigo-600 dark:text-indigo-400 text-right max-w-[150px] truncate">
                                        {{ recipient }}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <!-- Spacer for flex layout -->
                        <div class="flex-1"></div>
                        <!-- Submit Button -->
                        <button
                            type="submit"
                            :disabled="isSending || !isFormValid || !selectedAsset"
                            class="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 px-4 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                        >
                            <svg v-if="isSending" class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>{{ isSending ? 'Processing...' : 'Send Assets' }}</span>
                        </button>
                        <!-- Toggle Debug Button -->
                        <button
                            type="button"
                            @click="isDebugOpen = !isDebugOpen"
                            class="w-full text-xs font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center justify-center gap-2 py-2"
                        >
                            <svg class="w-3 h-3 transition-transform duration-300" :class="{ 'rotate-180': isDebugOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                            </svg>
                            {{ isDebugOpen ? 'Close Debug Terminal' : 'Open Debug Terminal' }}
                        </button>
                    </div>
                </form>
                <!-- Collapsible Debug Terminal -->
                <div
                    v-if="isDebugOpen"
                    class="border-t border-slate-200 dark:border-slate-800 bg-slate-950 transition-all duration-300 ease-in-out"
                >
                    <div class="p-6 flex justify-between items-center border-b border-slate-800">
                        <span class="text-slate-400 text-xs font-mono uppercase tracking-widest">
                            System Logs
                        </span>
                        <button
                            @click="debugLogs = []"
                            class="text-slate-500 hover:text-white text-xs font-mono uppercase tracking-wider transition-colors"
                        >
                            Clear Logs
                        </button>
                    </div>
                    <div
                        id="debug-terminal"
                        class="h-64 overflow-y-auto p-6 font-mono text-xs space-y-1 text-green-400"
                    >
                        <div v-if="debugLogs.length === 0" class="text-slate-600 italic">
                            // Waiting for transaction initiation...
                        </div>
                        <div v-for="(log, index) in debugLogs" :key="index" class="break-words">
                            > {{ log }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>
