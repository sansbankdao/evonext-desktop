<!-- src/components/ui/UiCard.vue -->
<template>
    <div
        :class="[
            'relative overflow-hidden rounded-card border border-edge bg-surface-card p-4 shadow-card',
            padded ? '' : 'p-0'
        ]"
    >
        <slot />
    </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ padded?: boolean }>(), { padded: true })
</script>
