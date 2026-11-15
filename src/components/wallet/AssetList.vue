<!-- src/components/wallet/AssetList.vue -->
<template>
    <div class="bg-surface-card rounded-card border border-edge shadow-sm p-8 flex flex-col h-full">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-bold text-content flex items-center gap-2">
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
                v-for="asset in filteredAssets"
                :key="asset.id"
                role="button"
                @click="openAsset(asset)"
                class="flex items-center justify-between p-4 rounded-control border border-edge  hover:border-indigo-500/30 hover:bg-surface-raise dark:hover:bg-surface-card transition-all cursor-pointer group"
            >
                <div class="flex items-center gap-4">
                    <div class="relative w-12 h-12 rounded-full bg-surface-card border border-edge flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                        <img
                            v-if="assetIconExists(asset)"
                            :src="getIconSrc(asset)"
                            :alt="asset.symbol"
                            class="w-8 h-8"
                        />

                        <svg v-else class="w-6 h-6 text-content-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>

                        <!-- The Shielded row carries the shield badge — both rows are
                             ticker DASH, so the marks MUST differ (the mobile lesson). -->
                        <span
                            v-if="asset.id === 'shielded'"
                            class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-indigo-600 border-2 border-surface-card flex items-center justify-center"
                            title="Shielded pool (Orchard)"
                        >
                            <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </span>
                    </div>

                    <div>
                        <p class="font-bold text-content group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {{ asset.name }}
                        </p>

                        <p class="text-xs font-mono text-content-faint">
                            {{ asset.symbol }}
                        </p>
                    </div>
                </div>

                <div class="text-right">
                    <p class="font-bold text-content">
                        {{ getNormalizedBalance(asset) }}
                    </p>

                    <p class="text-xs text-content-faint">
                        {{ formatCurrency(getAssetUsdValue(asset)) }}
                    </p>
                </div>
            </div>

            <div v-if="filteredAssets.length === 0 && !isLoading" class="flex flex-col items-center justify-center py-12 text-content-faint">
                <p class="text-sm font-medium">No assets found</p>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { DUSD_DECIMAL_PLACES, SANS_DECIMAL_PLACES } from '@/constants'
import type { IAsset } from '@/types'

const props = defineProps<{
    assets: IAsset[]
    isLoading: boolean
}>()

const router = useRouter()

/* The parity list is built in fixed order by the store (Transparent,
 * Shielded, then tokens — F43/F45); nothing is filtered out anymore. */
const filteredAssets = computed(() => {
    return props.assets
})

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
}

/* Credits-based rows (transparent/shielded) display credits/1e11; the USD
 * value comes straight from the store (price-applied at build time). */
const getAssetUsdValue = (asset: IAsset) => {
    if (asset.id === 'transparent' || asset.id === 'shielded') {
        return asset.usdValue || 0
    }
    return asset.usdValue || 0
}

const getNormalizedBalance = (asset: IAsset) => {
    if (asset.id === 'transparent' || asset.id === 'shielded') {
        /* The F43 row format: up to 4 decimals, trailing zeros trimmed. */
        const credits = String(asset.balance ?? '0')
        const dash = Number(credits) / 100_000_000_000
        if (dash === 0) return '0'
        return dash.toFixed(4).replace(/\.?0+$/, '')
    }

    const rawBalance = Number(asset.balance)
    if (!rawBalance) return '0.00'
    const symbol = asset.symbol.replace(/^t/i, '').toLowerCase()

    if (symbol === 'dusd') return (rawBalance / (10 ** DUSD_DECIMAL_PLACES)).toFixed(2)
    if (symbol === 'sans') return (rawBalance / (10 ** SANS_DECIMAL_PLACES)).toFixed(8)

    return rawBalance.toLocaleString()
}

/* The Shielded row opens the full-screen shielded wallet; everything else
 * keeps the existing asset-details route. */
const openAsset = (asset: IAsset) => {
    if (asset.id === 'shielded') {
        router.push('/wallet/shielded')
        return
    }
    router.push(`/wallet/asset/${asset.symbol}`)
}

const getIconSrc = (asset: IAsset) => {
    /* Transparent + Shielded both carry the DASH mark (the badge on the
     * Shielded tile is what distinguishes them — the mobile lesson). */
    if (asset.id === 'transparent' || asset.id === 'shielded') return '/icons/dash.svg'
    const clean = asset.symbol.toLowerCase().replace(/^t/, '')
    return `/icons/${clean}.svg`
}

const assetIconExists = (asset: IAsset) => {
    if (asset.id === 'transparent' || asset.id === 'shielded') return true
    const clean = asset.symbol.toLowerCase().replace(/^t/, '')
    return ['dash', 'sans', 'dusd'].includes(clean)
}
</script>
