<!-- src/components/connect/MnemonicGrid.vue -->
<template>
    <div class="space-y-4">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 relative">
            <div v-for="(_word, index) in seedWords" :key="index" class="relative group">
                <!-- Tooltip -->
                <span class="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-900/95 dark:bg-slate-800/95 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shadow-md z-10 pointer-events-none border border-slate-700 dark:border-slate-600 hidden sm:inline-block">
                    Word {{ index + 1 }}
                </span>

                <div class="relative">
                    <input
                        :ref="(el) => { if (el) inputs[index] = el as HTMLInputElement }"
                        v-model="seedWords[index]"
                        @input="handleInput(index, $event)"
                        @blur="onInputBlur(index)"
                        @focus="onInputFocus(index)"
                        @keydown="onKeydown(index, $event)"
                        @paste.prevent="handlePaste"
                        :type="showWords ? 'text' : 'password'"
                        autocomplete="off"
                        spellcheck="false"
                        :disabled="disabled"
                        :placeholder="showWords ? '' : (index + 1).toString()"
                        class="w-full bg-white dark:bg-slate-800 border-2 rounded-xl pt-10 pb-3 px-4 text-center text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none transition-all duration-200 font-mono text-sm tracking-wide shadow-sm peer z-10 relative disabled:opacity-60 disabled:cursor-not-allowed"
                        :class="[
                            getInputBorderClass(index),
                            'focus:ring-4 focus:ring-opacity-50 focus:shadow-md',
                            shakeClasses[index] ? 'animate-[shake_0.4s_ease-in-out]' : ''
                        ]"
                    />

                    <!-- Shake Reset -->
                    <Transition name="fade">
                        <div v-if="shakeClasses[index]" @after-leave="shakeClasses[index] = false" class="absolute inset-0 z-20 pointer-events-none"></div>
                    </Transition>

                    <!-- Feedback Icons -->
                    <div class="absolute top-1/2 right-3 -translate-y-1/2 pointer-events-none transition-opacity duration-200">
                        <svg v-if="isValidWord(seedWords[index])" class="w-5 h-5 text-emerald-500 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                        </svg>
                        <svg v-else-if="fieldBlurred[index] && seedWords[index] && !isValidWord(seedWords[index])" class="w-5 h-5 text-red-500 drop-shadow-sm animate-[pulse_2s_infinite]" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </div>

                    <!-- Suggestions Dropdown -->
                    <Transition name="slide-up">
                        <ul v-if="activeIndex === index && suggestions.length > 0"
                            class="absolute bottom-full left-0 w-full mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl z-50 max-h-48 overflow-auto focus-within:ring-2 focus-within:ring-cyan-500 transition-all"
                            role="listbox">
                            <li v-for="(suggestion, sIndex) in suggestions" :key="suggestion"
                                class="px-3 py-2 text-sm font-mono cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-900/50 transition-colors flex items-center justify-between"
                                :class="{'bg-cyan-100 dark:bg-cyan-900/50': sIndex === highlightedIndex}"
                                @mousedown.prevent="selectSuggestion(suggestion)"
                                @mouseenter="highlightedIndex = sIndex">
                                <span>{{ suggestion }}</span>
                            </li>
                        </ul>
                    </Transition>
                </div>
            </div>
        </div>

        <div class="text-xs text-slate-500 dark:text-slate-400 text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            You can paste your entire seed phrase into any field.
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useMnemonicValidator } from '@/composables/useMnemonic'

const props = defineProps<{
    modelValue: string[]
    showWords: boolean
    disabled?: boolean
    isReady?: boolean // Triggers 'submit' on Enter if true
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', val: string[]): void
    (e: 'submit'): void
    (e: 'paste', words: string[]): void // <-- ADDED: Emit paste event
}>()

const { isValidWord, getSuggestions, initWordlist } = useMnemonicValidator()

// Local state for UI interactions (not business logic)
const seedWords = ref<string[]>([])
const inputs = ref<(HTMLInputElement | null)[]>([])
const fieldBlurred = ref<boolean[]>([])
const shakeClasses = ref<boolean[]>([])
const activeIndex = ref(-1)
const suggestions = ref<string[]>([])
const highlightedIndex = ref(0)

onMounted(() => {
    initWordlist()
    seedWords.value = [...props.modelValue]
    resetUIState()
})

watch(() => props.modelValue, (newVal) => {
    // Only update local if length changed or content significantly different
    if (newVal.join(' ') !== seedWords.value.join(' ')) {
        seedWords.value = [...newVal]
        if (fieldBlurred.value.length !== newVal.length) {
            resetUIState()
        }
    }
})

const resetUIState = () => {
    const len = seedWords.value.length
    fieldBlurred.value = Array(len).fill(false)
    shakeClasses.value = Array(len).fill(false)
    inputs.value = Array(len).fill(null)
}

// Border Logic
const getInputBorderClass = (index: number) => {
    const word = seedWords.value[index]
    const isFocus = activeIndex.value === index
    const isBlurred = fieldBlurred.value[index]

    if (isFocus) return 'border-cyan-500 ring-4 ring-cyan-500/20 bg-cyan-50/30 dark:bg-cyan-900/20'
    if (isBlurred) {
        if (isValidWord(word)) return 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/30'
        if (word && word.trim().length > 0) return 'border-red-500 bg-red-50/50 dark:bg-red-900/30'
    }
    return 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
}

// Interactions
const handleInput = (index: number, event: Event) => {
    const target = event.target as HTMLInputElement
    seedWords.value[index] = target.value
    emit('update:modelValue', seedWords.value)

    shakeClasses.value[index] = false
    fieldBlurred.value[index] = false

    const list = getSuggestions(target.value)
    suggestions.value = list
    activeIndex.value = list.length > 0 ? index : -1
    highlightedIndex.value = 0
}

const onInputFocus = (index: number) => {
    shakeClasses.value[index] = false
    const list = getSuggestions(seedWords.value[index] as string)
    suggestions.value = list
    activeIndex.value = list.length > 0 ? index : -1
}

const onInputBlur = (index: number) => {
    fieldBlurred.value[index] = true
    const word = seedWords.value[index]
    if (word && !isValidWord(word)) {
        shakeClasses.value[index] = true
    }
    setTimeout(() => {
        if (activeIndex.value === index) {
            suggestions.value = []
            activeIndex.value = -1
        }
    }, 200)
}

const selectSuggestion = (word: string) => {
    const idx = activeIndex.value
    if (idx >= 0) {
        seedWords.value[idx] = word
        emit('update:modelValue', seedWords.value)
        suggestions.value = []
        activeIndex.value = -1
        focusNext(idx)
    }
}

const handlePaste = (event: ClipboardEvent) => {
    const pastedText = event.clipboardData?.getData('text') || ''
    const words = pastedText.toLowerCase().split(/\s+/).filter(w => w.length > 0)

    const totalSlots = seedWords.value.length
    const newWords = Array(totalSlots).fill('')

    for (let i = 0; i < Math.min(words.length, totalSlots); i++) {
        newWords[i] = words[i]
    }

    seedWords.value = newWords
    fieldBlurred.value = Array(totalSlots).fill(true) // Validate all
    emit('update:modelValue', seedWords.value)
    emit('paste', newWords) // <-- ADDED: Emit paste event with the words

    nextTick(() => {
         // Focus first empty
         const emptyIdx = newWords.findIndex(w => !w)
         const target = emptyIdx === -1 ? 0 : emptyIdx
         inputs.value[target]?.focus()
    })
}

const onKeydown = (index: number, event: KeyboardEvent) => {
    if (suggestions.value.length > 0) {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            highlightedIndex.value = (highlightedIndex.value + 1) % suggestions.value.length
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            highlightedIndex.value = (highlightedIndex.value - 1 + suggestions.value.length) % suggestions.value.length
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault()
            selectSuggestion(suggestions.value[highlightedIndex.value] as string)
            return
        }
    }

    if ((event.key === ' ' || event.key === 'Tab') && isValidWord(seedWords.value[index])) {
        event.preventDefault()
        focusNext(index)
    } else if (event.key === 'Enter') {
        event.preventDefault()
        if (props.isReady) {
            emit('submit')
        } else {
            focusNext(index)
        }
    }
}

const focusNext = (index: number) => {
    const nextIndex = (index + 1) % seedWords.value.length
    nextTick(() => inputs.value[nextIndex]?.focus())
}

onUnmounted(() => { inputs.value = [] })
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.2s ease-out; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(10px); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
