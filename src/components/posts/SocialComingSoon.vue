<!-- src/components/posts/SocialComingSoon.vue -->
<template>
    <UiCard class="p-8 text-center">
        <div class="mx-auto w-14 h-14 rounded-inner bg-brand/10 border border-brand/30 flex items-center justify-center mb-4">
            <svg class="w-7 h-7 text-brand-deep dark:text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        </div>
        <h2 class="text-title uppercase text-content mb-2">Coming Soon on Mainnet</h2>
        <p class="text-body text-content-soft max-w-md mx-auto">
            Social posting is powered by the Yappr contract, which is currently deployed on
            <span class="font-bold text-content">Testnet</span> only.
            Switch to Testnet in Settings to post and browse the feed.
        </p>
    </UiCard>
</template>

<script lang="ts" setup>
// Presentational notice shown in place of the social feed/composer while the
// Yappr social contract is testnet-only (see docs/HANDOFF-DCG-SDK-AND-SHIELDED.md §3.4).
import UiCard from '@/components/ui/UiCard.vue'
</script>
