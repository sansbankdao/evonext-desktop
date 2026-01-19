<!-- src/components/home/TrendingTopics.vue -->
<template>
    <div class="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Trending Topics
        </h2>

        <div class="flex flex-col gap-3">
            <a
                href="#"
                class="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 font-semibold"
                @click.prevent="goToBootstrap"
            >
                #Sansbank
            </a>

            <a
                href="#"
                class="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 font-semibold"
                @click.prevent="goToBootstrap"
            >
                #Dashpay
            </a>

            <a
                href="#"
                class="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 font-semibold"
                @click.prevent="goToBootstrap"
            >
                #DashCon2026
            </a>

            <a
                href="#"
                class="text-sky-500 dark:text-sky-400 hover:text-sky-600 dark:hover:text-sky-300 font-semibold"
                @click.prevent="goToBootstrap"
            >
                #EvoNext
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
