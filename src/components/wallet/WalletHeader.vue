<!-- src/components/wallet/WalletHeader.vue -->
 <template>
    <header class="w-full max-w-5xl flex items-center justify-between px-6 py-6">
        <div class="flex items-center gap-3">
            <div class="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
            </div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white">
                Wallet Dashboard
            </h1>
        </div>
        <div class="flex items-center gap-4">
            <button
                @click="$emit('refresh')"
                class="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Refresh"
            >
                <svg class="w-5 h-5" :class="{'animate-spin': isRefreshing}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path v-if="!isRefreshing" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
            </button>
            <div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span class="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                    {{ network || 'testnet' }}
                </span>
            </div>
        </div>
    </header>
</template>

<script setup lang="ts">
defineProps<{
    isRefreshing: boolean
    network: string
}>()
defineEmits(['refresh'])
</script>
