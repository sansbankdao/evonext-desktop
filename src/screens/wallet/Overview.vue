<!-- scr/screens/wallet/Overview.vuew -->
<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-slate-50 dark:bg-slate-950 pb-12">
        <!-- 1. Header -->
        <WalletHeader
            :network="Wallet.network"
            :is-refreshing="isRefreshing"
            @refresh="forceRefresh"
        />

        <div class="w-full max-w-5xl px-6 space-y-6">
            <!-- 2. Top Row: Balance & Collectibles -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="lg:col-span-2">
                    <BalanceCard
                        :balance="totalBalance"
                        :price="System.currentDashPrice || 0"
                        :price-change="System.priceChange24h"
                    />
                </div>

                <!-- Collectibles Placeholder -->
                <div class="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-black rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                    <div class="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 border border-white/20 shadow-lg">
                        <svg class="w-8 h-8 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <h3 class="text-2xl font-bold text-white mb-2">Collectibles</h3>
                    <p class="text-sm text-slate-400 mb-6 font-medium">Unique digital assets</p>
                    <button class="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-all backdrop-blur-md text-sm">
                        Coming Soon
                    </button>
                </div>
            </div>

            <!-- 3. Middle Row: Assets & Transactions -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[600px]">
                <AssetList
                    :assets="Wallet.assets"
                    :is-loading="Wallet.isLoading || isRefreshing"
                />

                <TransactionHistory
                    :transactions="Wallet.transactions"
                    :is-loading="Wallet.isLoading"
                />
            </div>

            <!-- 4. DEBUG SECTION (Requested) -->
            <div class="w-full bg-slate-900 rounded-xl border border-slate-700 overflow-hidden mt-8">
                <div
                    @click="showDebug = !showDebug"
                    class="p-4 bg-slate-800 border-b border-slate-700 cursor-pointer flex justify-between items-center hover:bg-slate-700 transition-colors"
                >
                    <div class="flex items-center gap-2">
                        <span class="text-red-400 font-mono font-bold">🛠 DEBUG DIAGNOSTICS</span>
                    </div>
                    <span class="text-xs text-slate-400">{{ showDebug ? 'Hide' : 'Show' }}</span>
                </div>

                <div v-if="showDebug" class="p-6 font-mono text-xs text-slate-300 space-y-4">
                    <!-- Status Check -->
                    <div class="grid grid-cols-2 gap-4 border-b border-slate-700 pb-4">
                        <div>
                            <span class="text-slate-500">Identity ID:</span>
                            <span class="ml-2 text-white bg-slate-800 px-1 rounded">{{ Identity.identityId || 'MISSING' }}</span>
                        </div>
                        <div>
                            <span class="text-slate-500">Network:</span>
                            <span class="ml-2 text-emerald-400">{{ Wallet.network }}</span>
                        </div>
                        <div>
                            <span class="text-slate-500">Store Txs Count:</span>
                            <span class="ml-2 text-white">{{ Wallet.transactions.length }}</span>
                        </div>
                    </div>

                    <!-- Manual Fetch Trigger -->
                    <div class="flex gap-2">
                        <button
                            @click="runDiagnostics"
                            class="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
                        >
                            Run Token Fetch Diagnostic
                        </button>
                        <button
                            @click="debugOutput = 'Cleared.'"
                            class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                        >
                            Clear Log
                        </button>
                    </div>

                    <!-- Raw Output -->
                    <div class="bg-black p-4 rounded border border-slate-700 overflow-x-auto max-h-96 whitespace-pre-wrap">
                        {{ debugOutput }}
                    </div>

                    <!-- Store Transactions Dump -->
                    <div class="mt-4">
                        <h4 class="font-bold text-slate-400 mb-2">Current Store Transactions (First 3):</h4>
                        <div class="bg-black p-4 rounded border border-slate-700 overflow-x-auto whitespace-pre-wrap">
                            {{ JSON.stringify(Wallet.transactions.slice(0, 3), null, 2) }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useWalletStore } from '@/stores/wallet'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { useWallet } from '@/composables/useWallet'
import { useNetwork } from '@/composables/useNetwork'

// Debug Imports
import { fetchTokenTransitions } from '@/stores/wallet/actions/api'
import { transformTokenTransitions } from '@/stores/wallet/actions/transforms'
import { DUSD_CONTRACT_ID_TESTNET, DUSD_DECIMAL_PLACES } from '@/constants'

// Components
import WalletHeader from '@/components/wallet/WalletHeader.vue'
import BalanceCard from '@/components/wallet/BalanceCard.vue'
import AssetList from '@/components/wallet/AssetList.vue'
import TransactionHistory from '@/components/wallet/TransactionHistory.vue'

const Wallet = useWalletStore()
const Identity = useIdentityStore()
const System = useSystemStore()
const wallet = useWallet()
const { ensure } = useNetwork()

const isRefreshing = ref(false)
const showDebug = ref(true) // Open by default for you
const debugOutput = ref('Ready to run diagnostics...')

const totalBalance = computed(() => {
    if (Identity.isConnected && Identity.balanceBigInt) {
        const dash = Number(Identity.dashBigInt) / 100_000_000
        const usd = dash * (System.currentDashPrice || 0)
        return { dash, usd }
    }
    const dashAsset = Wallet.assets.find(a => a.symbol === 'DASH')
    const dash = parseFloat(String(dashAsset?.balance || 0))
    return { dash, usd: dash * (System.currentDashPrice || 0) }
})

// --- Debug Logic ---
const runDiagnostics = async () => {
    debugOutput.value = "Running diagnostics...\n";

    if (!Identity.identityId) {
        debugOutput.value += "ERROR: No Identity ID found. Cannot fetch history.\n";
        return;
    }

    try {
        debugOutput.value += `1. Fetching DUSD Transitions for ${DUSD_CONTRACT_ID_TESTNET}...\n`;

        // Manual Fetch
        const rawData = await fetchTokenTransitions(
            DUSD_CONTRACT_ID_TESTNET,
            5,
            Wallet.network
        );

        debugOutput.value += `2. API Response Success. Items found: ${rawData.length}\n`;
        debugOutput.value += `3. Raw API Data (First Item):\n${JSON.stringify(rawData[0] || 'No items', null, 2)}\n\n`;

        // Attempt Transform
        const transformed = transformTokenTransitions(
            rawData,
            Identity.identityId,
            'DUSD',
            DUSD_DECIMAL_PLACES
        );

        debugOutput.value += `4. Transformed Data (First Item):\n${JSON.stringify(transformed[0] || 'No items', null, 2)}\n`;

    } catch (e: any) {
        debugOutput.value += `ERROR FETCHING TOKENS:\n${e.message}\n${JSON.stringify(e)}`;
    }
}

const forceRefresh = async () => {
    if (isRefreshing.value) return
    isRefreshing.value = true
    try {
        const currentNetwork = await ensure()
        if (Identity.isConnected) await Identity.fetchBalance()
        await Wallet.refreshBalances(currentNetwork)
        await System.fetchDashPrice()
    } finally {
        isRefreshing.value = false
    }
}

onMounted(async () => {
    await nextTick()
    const currentNetwork = await ensure()
    if (!System.currentDashPrice) System.fetchDashPrice()

    if (Identity.isConnected && Identity.identityId) {
        await Identity.fetchBalance()
        await Wallet.refreshBalances(currentNetwork)
    }
    wallet.startPolling(45000)
})
</script>
