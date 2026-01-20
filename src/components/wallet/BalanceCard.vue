<!-- src/components/wallet/BalanceCard.vue -->
<template>
    <div class="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col justify-between relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div class="relative z-10">
            <div class="flex justify-between items-start mb-4">
                <p class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Total Balance
                </p>

                <!-- Price Display -->
                <div class="text-right">
                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        Market Price
                    </div>

                    <div class="flex items-center justify-end gap-1.5 font-mono text-sm">
                        <span class="font-bold text-slate-700 dark:text-slate-300">
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
            </div>

            <div class="flex items-baseline gap-3 mb-2">
                <span class="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    {{ formattedUsd }}
                </span>

            </div>

            <p class="text-xl font-medium text-slate-500 dark:text-slate-400 mb-8">
                {{ formattedDash }} Dash Credits
            </p>

            <!-- Action Buttons -->
            <div class="grid grid-cols-3 gap-3">
                <button @click="router.push('/wallet/deposit')" class="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-emerald-500/30 hover:shadow-lg transition-all group">
                    <svg class="w-6 h-6 text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4" />
                    </svg>
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300">Deposit</span>
                </button>

                <button @click="router.push('/wallet/send')" class="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-indigo-500/30 hover:shadow-lg transition-all group">
                    <svg class="w-6 h-6 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Send</span>
                </button>

                <button @click="router.push('/wallet/swap')" class="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-amber-500/30 hover:shadow-lg transition-all group">
                    <svg class="w-6 h-6 text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span class="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-amber-700 dark:group-hover:text-amber-300">Swap</span>
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
