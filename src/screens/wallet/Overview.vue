<!-- scr/screens/wallet/Overview.vuew -->
<template>
    <main class="min-h-screen w-full flex flex-col items-center bg-surface-raise bg-surface-base pb-12">
        <Header title="Wallet" />

        <!-- 1. Header -->
        <WalletHeader
            :network="Wallet.network"
            :is-refreshing="isRefreshing"
            @refresh="forceRefresh"
        />

        <div class="w-full max-w-5xl px-6 space-y-6">
            <!-- 2. Balance Row: full width -->
            <BalanceCard
                :balance="totalBalance"
                :price="System.currentDashPrice || 0"
                :price-change="System.priceChange24h"
            />

            <!-- 3. Collectibles Row -->
            <div class="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-black rounded-card border border-edge shadow-sm p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden group">
                <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                <div class="flex items-center gap-4 relative z-10">
                    <div class="w-12 h-12 bg-surface-card/10 backdrop-blur-md rounded-inner flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-white/20 shadow-lg">
                        <svg class="w-6 h-6 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <div class="text-left">
                        <h3 class="text-lg font-bold text-white">Collectibles</h3>
                        <p class="text-sm text-content-faint font-medium">Unique digital assets</p>
                    </div>
                </div>
                <button class="relative z-10 px-6 py-2 bg-surface-card/10 hover:bg-surface-card/20 border border-white/20 text-white font-bold rounded-control transition-all backdrop-blur-md text-sm">
                    Coming Soon
                </button>
            </div>

            <!-- 4. Middle Row: Assets & Transactions -->
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
import Header from '@/components/Header.vue'
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
