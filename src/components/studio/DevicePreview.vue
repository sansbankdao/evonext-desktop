<!-- src/components/studio/DevicePreview.vue -->
 <script setup lang="ts">
import { ChevronDownIcon, PlayIcon, Cog6ToothIcon } from '@heroicons/vue/24/outline'
defineProps<{
    isOpen: boolean
}>()
defineEmits(['toggle'])
</script>
<template>
    <div class="border-t border-edge">
        <button @click="$emit('toggle')" class="w-full flex justify-between items-center p-4 hover:bg-surface-raise dark:hover:bg-surface-raise/50">
            <span class="font-semibold text-content">Device Preview</span>
            <div class="flex items-center gap-4 ml-auto px-4 border-r border-edge mr-2">
                <button title="Run"><PlayIcon class="w-5 h-5 text-content-faint hover:text-brand" /></button>
                <button title="Options"><Cog6ToothIcon class="w-5 h-5 text-content-faint" /></button>
            </div>
            <ChevronDownIcon :class="['w-5 h-5 transition-transform duration-300', isOpen && 'rotate-180']" />
        </button>
        <div :class="['overflow-hidden transition-all duration-500 ease-in-out', isOpen ? 'max-h-[850px]' : 'max-h-0']">
            <div class="p-4 flex justify-center bg-surface-raise bg-surface-card/20">
                <div class="w-full max-w-[320px] h-[640px] bg-surface-raise bg-surface-card rounded-[3rem] p-3 border-8 border-edge  shadow-2xl relative">
                    <!-- Notch -->
                    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-surface-raise bg-surface-card rounded-b-2xl z-10"></div>
                    <div class="w-full h-full bg-surface-card rounded-[2rem] overflow-hidden">
                        <iframe title="Preview" sandbox="allow-scripts" class="w-full h-full border-none"></iframe>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
