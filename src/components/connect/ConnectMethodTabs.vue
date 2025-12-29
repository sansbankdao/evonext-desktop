<!-- src/components/connect/ConnectMethodTabs.vue -->
<template>
    <div class="bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-sm p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div class="grid grid-cols-2 gap-2">
            <!-- Seed Phrase Tab -->
            <button
                @click="$emit('update-connection-method', 'seed')"
                type="button"
                :class="[
                    'py-4 px-6 text-center font-bold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                    value === 'seed'
                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg hover:shadow-xl hover:from-cyan-600 hover:to-cyan-700 ring-2 ring-cyan-400/30 col-span-1'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white col-span-1'
                ]"
                :aria-pressed="value === 'seed'"
                aria-label="Connect using Seed Phrase"
            >
                <svg v-if="value === 'seed'" class="w-5 h-5 inline mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                </svg>
                <svg v-else class="w-5 h-5 inline mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                </svg>
                <span>Seed Phrase</span>
            </button>
            <!-- Private Keys Tab -->
            <button
                @click="$emit('update-connection-method', 'privateKey')"
                type="button"
                :class="[
                    'py-4 px-6 text-center font-bold rounded-xl transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900',
                    value === 'privateKey'
                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg hover:shadow-xl hover:from-cyan-600 hover:to-cyan-700 ring-2 ring-cyan-400/30 col-span-1'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 hover:text-slate-900 dark:hover:text-white col-span-1'
                ]"
                :aria-pressed="value === 'privateKey'"
                aria-label="Connect using Private Keys"
            >
                <svg v-if="value === 'privateKey'" class="w-5 h-5 inline mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743A6 6 0 0110 17v4a2 2 0 012 2H7a2 2 0 01-2-2v-4a6 6 0 01-5.743-5.743A6 6 0 014 11a2 2 0 012-2" />
                </svg>
                <svg v-else class="w-5 h-5 inline mr-2 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743A6 6 0 0110 17v4a2 2 0 012 2H7a2 2 0 01-2-2v-4a6 6 0 01-5.743-5.743A6 6 0 014 11a2 2 0 012-2" />
                </svg>
                <span>Private Keys</span>
            </button>
        </div>
        <!-- Method Description -->
        <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div v-if="value === 'seed'" class="text-sm text-slate-600 dark:text-slate-400 px-2">
                <p class="flex items-center">
                    <svg class="w-4 h-4 mr-2 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Use 12 or 24 word mnemonic phrase
                </p>
            </div>
            <div v-else class="text-sm text-slate-600 dark:text-slate-400 px-2">
                <p class="flex items-center">
                    <svg class="w-4 h-4 mr-2 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Use individual authentication, transfer, and encryption keys
                </p>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
interface Props {
    value: 'seed' | 'privateKey'
}
interface Emits {
    (e: 'update-connection-method', method: 'seed' | 'privateKey'): void
}
defineProps<Props>()
const emit = defineEmits<Emits>()
</script>
