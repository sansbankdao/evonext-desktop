<!-- src/components/connect/ConnectErrorDisplay.vue -->
<template>
    <div v-if="error" class="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 p-6 rounded-2xl text-sm font-bold text-center shadow-lg flex items-start gap-3">
        <svg class="w-6 h-6 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {{ error }}
    </div>
</template>

<script setup lang="ts">
defineProps<{
    error: string | null
}>()
</script>
