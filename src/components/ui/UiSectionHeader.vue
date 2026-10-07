<!-- src/components/ui/UiSectionHeader.vue -->
<template>
    <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
            <div
                v-if="$slots.icon"
                class="p-2 rounded-inner bg-brand/10 text-brand-deep dark:text-brand"
            >
                <slot name="icon" />
            </div>
            <h2 class="text-title uppercase text-content-soft whitespace-nowrap">{{ title }}</h2>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <slot name="actions" />
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{ title: string }>()
</script>
