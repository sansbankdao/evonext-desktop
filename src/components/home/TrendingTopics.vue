<!-- src/components/home/TrendingTopics.vue -->
<template>
    <UiCard>
        <UiSectionHeader title="Trending Topics" class="mb-4">
            <template #icon>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.048 8.287 8.287 0 0 0 9 9.6a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" /><path stroke-linecap="round" stroke-linejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" /></svg>
            </template>
        </UiSectionHeader>

        <div class="flex flex-col gap-2">
            <a
                v-for="tag in topics"
                :key="tag"
                href="#"
                class="flex items-center justify-between px-3 py-2 rounded-inner bg-surface-raise/60 border border-edge hover:border-brand/40 hover:bg-surface-raise transition-colors"
                @click.prevent="goToBootstrap"
            >
                <span class="text-body font-bold text-brand-deep dark:text-brand">#{{ tag }}</span>
                <svg class="w-3.5 h-3.5 text-content-faint" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
            </a>
        </div>
    </UiCard>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import UiCard from '@/components/ui/UiCard.vue'
import UiSectionHeader from '@/components/ui/UiSectionHeader.vue'

const router = useRouter();

const topics = ['Sansbank', 'Dashpay', 'DashCon2026', 'EvoNext'];

const goToBootstrap = () => {
    router.push('/bootstrap');
};
</script>
