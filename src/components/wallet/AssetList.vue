<!-- src/components/wallet/AssetList.vue -->
 <template>
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col h-full">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                My Assets
            </h2>
            <div class="flex items-center gap-2">
                <span v-if="isLoading" class="text-xs font-bold text-amber-500 uppercase tracking-wide animate-pulse">Loading...</span>
            </div>
        </div>
        <div class="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            <div
                v-for="asset in assets"
                :key="asset.id"
                role="button"
                @click="router.push(`/wallet/asset/${asset.symbol}`)"
                class="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer group"
            >
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <img
                            v-if="assetIconExists(asset.symbol)"
                            :src="getIconSrc(asset.symbol)"
                            :alt="asset.symbol"
                            class="w-8 h-8"
                        />
                        <svg v-else class="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <p class="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{{ asset.name }}</p>
                        <p class="text-xs font-mono text-slate-500 dark:text-slate-400">{{ asset.symbol }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-slate-900 dark:text-white">{{ getNormalizedBalance(asset) }}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400">{{ formatCurrency(asset.usdValue || 0) }}</p>
                </div>
            </div>
            <div v-if="assets.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-12 text-slate-400">
                <p class="text-sm font-medium">No assets found</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { DUSD_DECIMAL_PLACES, SANS_DECIMAL_PLACES } from '@/constants'
import type { IAsset } from '@/types'

defineProps<{
    assets: IAsset[]
    isLoading: boolean
}>()

const router = useRouter()

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

const getNormalizedBalance = (asset: IAsset) => {
    const rawBalance = Number(asset.balance)
    if (!rawBalance) return '0.00'
    const symbol = asset.symbol.replace(/^t/i, '').toLowerCase()

    if (symbol === 'credits') return (rawBalance / 100_000_000_000).toFixed(2)
    if (symbol === 'dusd') return (rawBalance / (10 ** DUSD_DECIMAL_PLACES)).toFixed(2)
    if (symbol === 'sans') return (rawBalance / (10 ** SANS_DECIMAL_PLACES)).toFixed(8)
    if (symbol === 'dash') return (rawBalance < 1_000_000 ? rawBalance : rawBalance / 100_000_000).toFixed(8)

    return rawBalance.toLocaleString()
}

const getIconSrc = (symbol: string) => {
    const clean = symbol.toLowerCase().replace(/^t/, '')
    return clean === 'credits' ? '/icons/dash.svg' : `/icons/${clean}.svg`
}

const assetIconExists = (symbol: string) => {
    const clean = symbol.toLowerCase().replace(/^t/, '')
    return ['dash', 'sans', 'dusd', 'credits'].includes(clean)
}
</script>
