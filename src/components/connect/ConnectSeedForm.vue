<!-- src/components/connect/ConnectSeedForm.vue -->
<template>
    <div class="space-y-6">
        <!-- Header Row: Phrase Length & Visibility Toggle -->
        <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <!-- Phrase Length Selector -->
            <div class="flex-1">
                <label class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <svg class="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2h10a2 2 0 012 2v2m0 0V9a2 2 0 00-2-2M5 11a2 2 0 012-2h10a2 2 0 012 2" />
                    </svg>
                    Phrase Length
                </label>

                <fieldset class="grid grid-cols-2 gap-3">
                    <label :class="[
                        'flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 group',
                        wordCount === '12'
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 border-cyan-400 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800'
                    ]">
                        <input type="radio" value="12" v-model="wordCount" class="sr-only">
                        <span class="font-bold text-base">12 Words</span>
                    </label>

                    <label :class="[
                        'flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 group',
                        wordCount === '24'
                            ? 'bg-gradient-to-r from-cyan-500 to-cyan-600 border-cyan-400 text-white shadow-cyan-500/25 ring-2 ring-cyan-400/30'
                            : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-cyan-500 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-slate-900 dark:hover:text-slate-100 bg-white dark:bg-slate-800'
                    ]">
                        <input type="radio" value="24" v-model="wordCount" class="sr-only">
                        <span class="font-bold text-base">24 Words</span>
                    </label>
                </fieldset>
            </div>

            <!-- Visibility Toggle -->
            <button
                type="button"
                @click="showWords = !showWords"
                class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors shadow-sm h-[52px]"
            >
                <svg v-if="!showWords" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
                <span class="text-sm font-medium">{{ showWords ? 'Hide Words' : 'Show Words' }}</span>
            </button>
        </div>

        <!-- Seed Word Inputs -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div v-for="(_word, index) in seedWords" :key="index" class="relative group">
                <span class="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-900/90 dark:bg-slate-800/90 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-md z-10">
                    {{ index + 1 }}
                </span>

                <input
                    v-model="seedWords[index]"
                    @paste.prevent="handlePaste"
                    :type="showWords ? 'text' : 'password'"
                    autocomplete="off"
                    spellcheck="false"
                    :placeholder="(index + 1).toString()"
                    class="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-600 rounded-xl pt-10 pb-3 px-4 text-center text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-4 focus:ring-cyan-400/30 focus:border-cyan-500 focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 font-mono text-sm tracking-wide shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 focus:outline-none"
                    :aria-label="`Seed word ${index + 1}`"
                    @input="emitUpdate"
                >
            </div>
        </div>

        <!-- Paste Helper -->
        <div class="text-xs text-slate-500 dark:text-slate-400 text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <svg class="w-4 h-4 inline mr-2 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>

            You can paste your entire seed phrase into any field.
            The words will be automatically distributed.
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
    wordCount: '12' | '24'
    seedWords: string[]
}

interface Emits {
    (e: 'update:wordCount', count: '12' | '24'): void
    (e: 'update:seedWords', words: string[]): void
    (e: 'paste', words: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const wordCount = ref(props.wordCount)
const seedWords = ref([...props.seedWords])
const showWords = ref(false) // State toggle for visibility

// Watch word count changes and adjust array size
watch(wordCount, (newCount) => {
    emit('update:wordCount', newCount)

    const count = parseInt(newCount, 10)

    if (seedWords.value.length > count) {
        seedWords.value = seedWords.value.slice(0, count)
    } else if (seedWords.value.length < count) {
        seedWords.value = [...seedWords.value, ...Array(count - seedWords.value.length).fill('')]
    }

    emit('update:seedWords', seedWords.value)
})

// Watch seed words changes
watch(seedWords, (newWords) => {
    emit('update:seedWords', newWords)
}, { deep: true })

// Handle paste event
const handlePaste = (event: ClipboardEvent) => {
    const pastedText = event.clipboardData?.getData('text') || ''

    // Split by whitespace and clean up
    const words = pastedText
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)

    const totalSlots = seedWords.value.length

    // Clear all fields first
    seedWords.value = Array(totalSlots).fill('')

    // Distribute words across slots
    for (let i = 0; i < Math.min(words.length, totalSlots); i++) {
        seedWords.value[i] = words[i] || ''
    }

    // Emit the updated seed words to parent
    emit('update:seedWords', seedWords.value)

    // Emit paste event with words for parent
    emit('paste', words)
}

const emitUpdate = () => {
    emit('update:seedWords', seedWords.value)
}
</script>
