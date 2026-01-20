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
