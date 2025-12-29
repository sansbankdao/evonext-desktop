<!-- src/components/connect/SecurityWarning.vue -->
<template>
    <div class="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300 p-6 rounded-2xl shadow-lg flex items-start gap-3">
        <svg class="w-6 h-6 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
            <h3 class="font-bold text-base mb-2">Security Notice</h3>
            <p class="text-sm leading-relaxed">Your credentials are processed locally and never sent to any server. Always connect in a secure, private environment.</p>
        </div>
    </div>
</template>

<script setup lang="ts">
// No logic needed for this component
</script>
