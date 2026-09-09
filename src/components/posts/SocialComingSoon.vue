<!-- src/components/posts/SocialComingSoon.vue -->
<template>
    <div class="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center">
        <div class="mx-auto w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 flex items-center justify-center mb-4">
            <svg class="w-7 h-7 text-cyan-600 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        <h2 class="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Coming Soon on Mainnet</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Social posting is powered by the Yappr contract, which is currently deployed on
            <span class="font-bold text-slate-700 dark:text-slate-200">Testnet</span> only.
            Switch to Testnet in Settings to post and browse the feed.
        </p>
    </div>
</template>

<script lang="ts" setup>
// Presentational notice shown in place of the social feed/composer while the
// Yappr social contract is testnet-only (see docs/HANDOFF-DCG-SDK-AND-SHIELDED.md §3.4).
</script>
