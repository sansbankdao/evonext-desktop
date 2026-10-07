<!-- src/components/studio/PublishingManager.vue -->
<script setup lang="ts">
import { ChevronDownIcon } from '@heroicons/vue/24/outline'
defineProps<{
    isOpen: boolean
}>()
defineEmits(['toggle'])
</script>
<template>
    <div class="border-b border-edge">
        <button
            @click="$emit('toggle')"
            class="w-full flex justify-between items-center p-4 hover:bg-surface-raise dark:hover:bg-surface-raise/50"
        >
            <span class="font-semibold text-content">
                Publishing Manager
            </span>
            <ChevronDownIcon :class="['w-5 h-5 transition-transform duration-300', isOpen && 'rotate-180']" />
        </button>
        <div :class="['overflow-hidden transition-all duration-500 ease-in-out', isOpen ? 'max-h-[500px]' : 'max-h-0']">
            <div class="p-4 pt-0">
                <div class="mt-2 bg-surface-raise/60 rounded-control p-4 border border-edge/50 /50">
                    <h3 class="text-sm font-bold text-content mb-2 uppercase tracking-wider">Dash Platform</h3>
                    <p class="text-xs text-content-soft mb-4">
                        Pushing documents to Dash Drive.
                    </p>
                    <button class="w-full bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold py-2 px-4 rounded-lg shadow transition-colors">
                        Publish v1.0.0
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
