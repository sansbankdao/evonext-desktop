<!-- src/screens/Portfolio.vue -->
<template>
    <main class="min-h-screen bg-slate-50 dark:bg-slate-950 pb-12">
        <Header title="Portfolio Manager" />

        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <!-- Summary Stats -->
            <section class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div class="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Estimated Net Worth
                    </p>
                    <div class="flex items-baseline gap-3">
                        <h2 class="text-5xl font-black text-slate-900 dark:text-white">
                            {{ formatCurrency(totalBalance.usd) }}
                        </h2>
                    </div>
                    <div class="mt-4 flex items-center gap-2">
                        <span class="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                            +2.4% (24h)
                        </span>
                        <span class="text-xs font-medium text-slate-400 uppercase tracking-tight">
                            Market Performance
                        </span>
                    </div>
                </div>

                <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">DASH Balance</p>
                    <p class="text-xl font-black text-slate-900 dark:text-white">
                        {{ totalBalance.dash.toLocaleString(undefined, { maximumFractionDigits: 4 }) }}
                    </p>
                </div>

                <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                    <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Identity Credits</p>
                    <p class="text-xl font-black text-slate-900 dark:text-white">
                        {{ totalBalance.credits.toLocaleString() }}
                    </p>
                </div>
            </section>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Assets Table -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div class="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <h3 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Your Assets</h3>
                            <button @click="refreshData" class="text-xs font-bold text-cyan-600 uppercase tracking-widest hover:text-cyan-500 transition-colors">
                                Refresh Table
                            </button>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-slate-50/50 dark:bg-slate-800/50">
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Price</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Balance</th>
                                        <th class="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value (USD)</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                                    <tr v-for="asset in walletStore.assets" :key="asset.symbol" class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td class="px-6 py-4">
                                            <div class="flex items-center gap-3">
                                                <div class="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/50 dark:border-slate-700">
                                                    <img v-if="getIconSrc(asset.symbol)" :src="getIconSrc(asset.symbol) as string" class="w-6 h-6" />
                                                    <span v-else class="text-xs font-black">{{ asset.symbol[0] }}</span>
                                                </div>
                                                <div>
                                                    <p class="text-sm font-black text-slate-900 dark:text-white uppercase">{{ asset.symbol }}</p>
                                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Mainnet Cluster</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4">
                                            <p class="text-sm font-medium text-slate-600 dark:text-slate-300">
                                                {{ (asset.symbol === 'DASH' || asset.symbol === 'tDASH') ? formatCurrency(systemStore.currentDashPrice) : '---' }}
                                            </p>
                                        </td>
                                        <td class="px-6 py-4">
                                            <p class="text-sm font-black text-slate-900 dark:text-white">
                                                {{ getNormalizedBalance(asset) }}
                                            </p>
                                        </td>
                                        <td class="px-6 py-4 text-right">
                                            <p class="text-sm font-black text-slate-900 dark:text-white">
                                                {{ calculateAssetValue(asset) }}
                                            </p>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <!-- Portfolio Actions Sidebar -->
                <div class="space-y-6">
                    <div class="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden group">
                        <div class="relative z-10">
                            <h3 class="text-lg font-black mb-1">Quick Transfer</h3>
                            <p class="text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">Move funds between identities</p>

                            <div class="space-y-4">
                                <button class="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                                    Send Assets
                                </button>
                                <button class="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
                                    Receive
                                </button>
                            </div>
                        </div>
                        <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-cyan-600/10 rounded-full blur-2xl group-hover:bg-cyan-600/20 transition-all"></div>
                    </div>

                    <div class="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <h3 class="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Allocation</h3>
                        <div class="space-y-4">
                            <div v-for="asset in walletStore.assets.slice(0, 3)" :key="asset.symbol + '-bar'">
                                <div class="flex justify-between text-[10px] font-black uppercase mb-1">
                                    <span class="text-slate-500">{{ asset.symbol }}</span>
                                    <span class="text-slate-900 dark:text-white">85%</span>
                                </div>
                                <div class="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div class="h-full bg-cyan-500 rounded-full" style="width: 85%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { useWalletStore } from '@/stores/wallet'
import { useNetwork } from '@/composables/useNetwork'
import Header from '@/components/Header.vue'

const identityStore = useIdentityStore()
const systemStore = useSystemStore()
const walletStore = useWalletStore()
const { network: currentNetwork } = useNetwork()

const totalBalance = computed(() => {
    const raw = Number(identityStore.balance || 0)
    const dash = (raw / 1000) / 100000000
    return {
        dash,
        usd: dash * (systemStore.currentDashPrice || 0),
        credits: raw
    }
})

const getNormalizedBalance = (asset: any) => {
    const raw = Number(asset.balance) || 0
    const divisor = asset.symbol.toUpperCase().includes('USD') ? 100 : 100000000
    return (raw / divisor).toLocaleString(undefined, { maximumFractionDigits: 4 })
}

const calculateAssetValue = (asset: any) => {
    const balance = Number(getNormalizedBalance(asset).replace(/,/g, ''))
    if (asset.symbol.toLowerCase().includes('usd')) return formatCurrency(balance)
    if (asset.symbol.toLowerCase().includes('dash')) return formatCurrency(balance * (systemStore.currentDashPrice || 0))
    return '0.00 USD'
}

const getIconSrc = (symbol: string) => {
    const s = symbol.toLowerCase().replace(/^t/, '')
    const supported = ['dash', 'dusd', 'sans']
    return supported.includes(s) ? `/icons/${s}.svg` : null
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(val || 0).replace('$', '') + ' USD'
}

const refreshData = async () => {
    if (identityStore.isAuthenticated) {
        await Promise.all([
            identityStore.fetchBalance(),
            walletStore.refreshBalances(currentNetwork.value)
        ])
    }
}

onMounted(async () => {
    await refreshData()
})
</script>
