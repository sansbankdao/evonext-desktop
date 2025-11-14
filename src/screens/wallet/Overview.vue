<!-- src/screens/wallet/Overview.vue -->
<template>
    <main class="">
        <header class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
            <h1 class="text-3xl font-bold text-white mb-4 sm:mb-0">
                Wallet Dashboard
            </h1>

            <div v-if="Wallet.user" class="flex items-center gap-4 bg-slate-800 p-2 rounded-lg w-full sm:w-auto">
                <span class="flex-grow flex flex-col overflow-hidden">
                    <span class="text-sky-100 text-lg font-mono px-2 tracking-wider truncate">
                        {{ Wallet.user.name }}
                    </span>

                    <span class="text-sky-300/70 text-xs font-mono px-2 tracking-tighter truncate">
                        {{ Wallet.user.address }}
                    </span>
                </span>

                <button @click="copyAddress" class="p-2 rounded-md hover:bg-slate-700 transition-colors flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
        </header>

        <!-- Balance Card & Actions -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div class="lg:col-span-2 bg-slate-800 p-6 rounded-xl">
                <div class="flex justify-between items-start">
                    <div>
                        <p class="text-slate-400 text-sm">
                            Total Balance
                        </p>

                        <p class="text-4xl font-bold text-white mt-1">
                            {{ formatCurrency(Wallet.totalUsdValue) }}
                        </p>

                        <p
                            v-if="Wallet.balanceChange"
                            class="text-sm mt-1"
                            :class="Wallet.balanceChange.isPositive ? 'text-green-400' : 'text-red-400'"
                        >
                            {{ Wallet.balanceChange.isPositive ? '+' : '' }}{{ Wallet.balanceChange.percent.toFixed(2) }}%
                            ({{ formatCurrency(Wallet.balanceChange.amount) }}) vs last 24h
                        </p>
                    </div>

                    <div class="flex items-center gap-1 bg-slate-700 px-3 py-1 rounded-full text-sm">
                        <span class="w-2 h-2 rounded-full bg-green-400"></span>
                        <span>
                            Dash Platform
                        </span>
                    </div>
                </div>

                <div class="mt-6 flex flex-col sm:flex-row gap-3">
                    <button @click="router.push('/wallet/send')" class="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-indigo-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                        <span>Send</span>
                    </button>

                    <button @click="router.push('/wallet/receive')" class="w-full flex items-center justify-center gap-2 bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                        <span>Receive</span>
                    </button>

                    <button @click="router.push('/wallet/swap')" class="w-full flex items-center justify-center gap-2 bg-slate-700 text-white font-semibold py-3 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span>Swap</span>
                    </button>
                </div>
            </div>

            <div class="bg-slate-800 p-6 rounded-xl flex flex-col justify-center items-center text-center">
                <p class="text-3xl font-semibold text-white">
                    Collectibles
                </p>

                <p class="text-xs text-slate-400 mt-1 uppercase tracking-widest">
                    unique digital assets
                </p>

                <button class="mt-4 bg-slate-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors text-sm tracking-wide">
                    Coming Soon
                </button>
            </div>
        </div>

        <!-- Assets & Transactions -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <!-- Assets List -->
            <div class="bg-slate-800 p-6 rounded-xl">
                <h2 class="text-xl font-semibold text-white mb-4">
                    My Assets
                </h2>

                <div class="flex flex-col gap-4">
                    <div v-for="asset in Wallet.assets" :key="asset.ticker" class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <img
                                :src="`/icons/${asset.ticker.toLowerCase()}.svg`"
                                :alt="asset.ticker"
                                class="size-10 rounded-full bg-slate-700 p-1"
                            />
                            <div>
                                <p class="font-semibold text-white">{{ asset.name }}</p>
                                <p class="text-sm text-slate-400">{{ asset.ticker }}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-white">{{ asset.amount.toLocaleString() }} {{ asset.ticker }}</p>
                            <p class="text-sm text-slate-400">{{ formatCurrency(asset.usdValue) }}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Transactions -->
            <div class="bg-slate-800 p-6 rounded-xl">
                <h2 class="text-xl font-semibold text-white mb-4">
                    Recent Activity
                </h2>

                <div class="flex flex-col gap-4">
                    <div v-for="tx in Wallet.transactions" :key="tx.id" class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="p-2 bg-slate-700 rounded-full">
                                <svg v-if="tx.type === 'sent'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                <svg v-if="tx.type === 'received'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                </svg>
                                <svg v-if="tx.type === 'swap'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <div>
                                <p class="font-semibold text-white">{{ tx.title }}</p>
                                <p class="text-sm text-slate-400 font-mono">{{ tx.subtitle }}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-semibold text-white">{{ tx.amount }}</p>
                            <p class="text-sm" :class="getStatusColor(tx.status)">
                                {{ tx.status }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'

const router = useRouter()
const Wallet = useWalletStore()

const formatCurrency = (value: number) => {
    if (typeof value !== 'number') return '$0.00'
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value)
}

const copyAddress = async () => {
    if (!Wallet.user?.address) return
    try {
        await navigator.clipboard.writeText(Wallet.user.address)
        alert('Address copied to clipboard!') // Replace with a toast notification
    } catch (err) {
        console.error('Failed to copy address: ', err)
    }
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'Completed': return 'text-slate-400'
        case 'Pending...': return 'text-yellow-400'
        case 'Failed': return 'text-red-400'
        default: return 'text-slate-400'
    }
}

onMounted(() => {
    if (!Wallet.user) {
        Wallet.initializeMockData()
    }
})
</script>
