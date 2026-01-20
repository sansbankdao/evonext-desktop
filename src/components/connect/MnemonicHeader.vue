<!-- src/components/connect/MnemonicHeader.vue -->
 <template>
    <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <!-- Phrase Length -->
        <div class="flex-1">
            <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <svg class="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                </svg>
                Phrase Length
            </label>
            <fieldset class="grid grid-cols-2 gap-3">
                <label v-for="count in ['12', '24']" :key="count"
                    class="flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 group relative overflow-hidden"
                    :class="modelValue === count
                        ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 border-cyan-400 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                        : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800'">
                    <input
                        type="radio"
                        :value="count"
                        :checked="modelValue === count"
                        @change="$emit('update:modelValue', count as '12' | '24')"
                        :disabled="disabled"
                        class="sr-only disabled:cursor-not-allowed"
                    >
                    <span class="font-bold text-base relative z-10" :class="{'opacity-50': disabled}">
                        {{ count }} Words
                    </span>
                </label>
            </fieldset>
        </div>

        <!-- Status Badge & Visibility -->
        <div class="flex items-center gap-2 sm:gap-4">
            <!-- Validation Status Badge -->
            <div class="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border font-mono transition-all duration-300"
                :class="[
                    isValid ? 'bg-emerald-100 dark:bg-emerald-800/40 border-emerald-400 text-emerald-800 dark:text-emerald-200' :
                    error ? 'bg-red-100 dark:bg-red-800/40 border-red-400 text-red-800 dark:text-red-200' :
                    'bg-slate-100 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300',
                    error ? 'animate-[shake_0.5s_ease-in-out]' : ''
                ]"
                role="status">
                <svg v-if="isValid" class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <svg v-else-if="error" class="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
                <span class="whitespace-nowrap">
                    {{ filledCount }} / {{ totalCount }} {{ isValid ? 'Valid!' : error ? 'Invalid' : 'Words' }}
                </span>
            </div>

            <!-- Visibility Toggle -->
            <button
                type="button"
                @click="$emit('update:showWords', !showWords)"
                :disabled="disabled"
                class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shadow-sm h-[46px] sm:h-[52px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg v-if="!showWords" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: '12' | '24' // wordCount
    showWords: boolean
    disabled?: boolean
    isValid: boolean
    error: boolean
    filledCount: number
    totalCount: number
}>()

defineEmits<{
    (e: 'update:modelValue', val: '12' | '24'): void
    (e: 'update:showWords', val: boolean): void
}>()
</script>
