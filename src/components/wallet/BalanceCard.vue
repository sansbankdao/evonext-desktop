<!-- src/components/wallet/BalanceCard.vue -->
<template>
    <div class="bg-gradient-to-br from-white via-white to-slate-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 rounded-card border border-edge shadow-sm p-8 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none"></div>

        <div class="relative z-10 flex flex-col xl:flex-row xl:items-center gap-8">
            <!-- Balance -->
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-content-faint uppercase tracking-wider mb-2">
                    Total Balance
                </p>

                <div class="flex items-baseline gap-3">
                    <span class="text-5xl font-black text-content tracking-tight">
                        {{ formattedUsd }}
                    </span>
                </div>

                <p class="text-lg font-medium text-content-faint mt-1">
                    {{ formattedDash }} DASH
                </p>
            </div>

            <!-- Market Price -->
            <div class="xl:border-l xl:border-edge dark:xl:border-edge xl:pl-8 shrink-0">
                <div class="text-[10px] font-bold text-content-faint uppercase tracking-widest mb-1">
                    Market Price
                </div>

                <div class="flex items-center gap-1.5 font-mono text-sm">
                    <span class="font-bold text-content">
                        ${{ price?.toFixed(2) || '0.00' }}
                    </span>

                    <div class="flex items-center gap-1 px-1.5 py-0.5 rounded-md" :class="isPricePositive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'">
                        <svg class="w-3 h-3" :class="isPricePositive ? '' : 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>

                        <span class="text-[10px] font-bold">
                            {{ priceChange > 0 ? '+' : '' }}{{ priceChange.toFixed(2) }}%
                        </span>
                    </div>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="grid grid-cols-3 gap-3 xl:min-w-[360px]">
                <button @click="router.push('/wallet/deposit')" class="flex flex-col items-center justify-center gap-2 p-4 rounded-inner bg-surface-raise bg-surface-base border border-edge hover:bg-surface-raise dark:hover:bg-surface-card hover:border-emerald-500/30 hover:shadow-lg transition-all group">
                    <svg class="w-6 h-6 text-content-soft group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span class="text-xs font-bold text-content-soft group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Deposit</span>
                </button>

                <button @click="router.push('/wallet/send')" class="flex flex-col items-center justify-center gap-2 p-4 rounded-inner bg-surface-raise bg-surface-base border border-edge hover:bg-surface-raise dark:hover:bg-surface-card hover:border-indigo-500/30 hover:shadow-lg transition-all group">
                    <svg class="w-6 h-6 text-content-soft group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span class="text-xs font-bold text-content-soft group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Send</span>
                </button>

                <button @click="router.push('/wallet/swap')" class="flex flex-col items-center justify-center gap-2 p-4 rounded-inner bg-surface-raise bg-surface-base border border-edge hover:bg-surface-raise dark:hover:bg-surface-card hover:border-amber-500/30 hover:shadow-lg transition-all group">
                    <svg class="w-6 h-6 text-content-soft group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span class="text-xs font-bold text-content-soft group-hover:text-amber-700 dark:group-hover:text-amber-300">Swap</span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
    balance: { dash?: number, usd?: number }
    price: number
    priceChange: number
}>()

const router = useRouter()

const isPricePositive = computed(() => props.priceChange >= 0)

const formattedUsd = computed(() => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(props.balance.usd || 0)
})

const formattedDash = computed(() => {
    return props.balance.dash?.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '0'
})
</script>
