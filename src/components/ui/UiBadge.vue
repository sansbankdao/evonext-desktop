<!-- src/components/ui/UiBadge.vue -->
<template>
    <span
        :class="[
            'inline-flex items-center justify-center rounded-full font-bold',
            size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-caption px-2 py-0.5',
            toneClass
        ]"
    >
        <slot />
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
    tone?: 'brand' | 'up' | 'down' | 'warn' | 'neutral'
    size?: 'sm' | 'md'
}>(), {
    tone: 'neutral',
    size: 'md',
})

const toneClass = computed(() => ({
    brand: 'bg-brand/15 text-brand-deep dark:text-brand',
    up: 'bg-up/15 text-up',
    down: 'bg-down/15 text-down',
    warn: 'bg-warn/15 text-warn',
    neutral: 'bg-surface-raise text-content-soft',
}[props.tone]))
</script>
