<!-- src/components/ui/UiButton.vue -->
<template>
    <button
        :type="type"
        :disabled="disabled"
        :class="[
            'inline-flex items-center justify-center gap-2 font-bold transition-all rounded-control disabled:opacity-40 disabled:cursor-not-allowed',
            sizeClass,
            variantClass
        ]"
    >
        <slot />
    </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
    variant?: 'primary' | 'ghost' | 'outline' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    type?: 'button' | 'submit'
    disabled?: boolean
}>(), {
    variant: 'primary',
    size: 'md',
    type: 'button',
    disabled: false,
})

const sizeClass = computed(() => ({
    sm: 'text-caption px-3 py-1.5',
    md: 'text-body px-5 py-2',
    lg: 'text-body px-8 py-2.5',
}[props.size]))

const variantClass = computed(() => ({
    primary: 'bg-brand-deep hover:bg-brand text-white shadow-glow',
    ghost: 'bg-surface-raise hover:bg-edge text-content',
    outline: 'border border-edge hover:border-brand/50 text-content-soft hover:text-content bg-transparent',
    danger: 'bg-down/90 hover:bg-down text-white',
}[props.variant]))
</script>
