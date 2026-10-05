<!-- src/components/home/TrendingTopics.vue -->
<template>
    <div class="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div class="flex items-center gap-3 mb-4">
            <div class="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                <svg class="w-4 h-4 text-orange-500 dark:text-orange-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.048 8.287 8.287 0 0 0 9 9.6a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" /></svg>
            </div>
            <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Trending Topics
            </h2>
        </div>

        <div class="flex flex-col gap-2">
            <a
                href="#"
                class="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                @click.prevent="goToBootstrap"
            >
                <span class="text-sm font-bold text-cyan-600 dark:text-cyan-400">#Sansbank</span>
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </a>

            <a
                href="#"
                class="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                @click.prevent="goToBootstrap"
            >
                <span class="text-sm font-bold text-cyan-600 dark:text-cyan-400">#Dashpay</span>
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </a>

            <a
                href="#"
                class="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                @click.prevent="goToBootstrap"
            >
                <span class="text-sm font-bold text-cyan-600 dark:text-cyan-400">#DashCon2026</span>
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </a>

            <a
                href="#"
                class="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-cyan-500/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                @click.prevent="goToBootstrap"
            >
                <span class="text-sm font-bold text-cyan-600 dark:text-cyan-400">#EvoNext</span>
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </a>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goToBootstrap = () => {
    router.push('/bootstrap');
};
</script>
