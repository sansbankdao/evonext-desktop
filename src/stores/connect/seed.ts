// src/stores/connect/seed.ts

import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useDebounce } from '@/composables/useDebounce'
import type { ScanProgress } from '@/services/identity/types'
import type { DiscoveredIdentity } from '@/types'

export const useSeedStore = defineStore('connect.seed', () => {
    const wordCount = ref<'12' | '24'>('12')
    const words = ref<string[]>(Array(12).fill(''))
    const discoveryResults = ref<DiscoveredIdentity[]>([])
    const selectedIdentityId = ref<string | null>(null)
    const discoveryError = ref<string | null>(null)
    const isSearching = ref(false)
    const progress = ref<ScanProgress | null>(null)

    const requiredCount = computed(() => parseInt(wordCount.value, 10))
    const isFilled = computed(() =>
        words.value.length === requiredCount.value &&
        words.value.every(w => w.trim())
    )
    const phrase = computed(() => words.value.join(' ').trim())

    // useDebounce now properly accepts () => T
    const debouncedPhrase = useDebounce(() => phrase.value, 500)

    const setWordCount = (count: '12' | '24') => {
        wordCount.value = count
        const newLength = parseInt(count)
        words.value = Array(newLength).fill('')
        reset()
    }

    const handlePaste = (pasted: string | string[]) => {
        const inputWords = Array.isArray(pasted)
            ? pasted
            : pasted.split(/\s+/).filter(Boolean)
        const count = requiredCount.value
        words.value = [
            ...inputWords.slice(0, count),
            ...Array(Math.max(0, count - inputWords.length)).fill('')
        ]
    }

    const discover = async (_inputPhrase: string) => {
        if (!isFilled.value || isSearching.value) return
        isSearching.value = true
        discoveryError.value = null
        discoveryResults.value = []
        selectedIdentityId.value = null
        progress.value = null
        // Service call will be triggered by useConnect composable
    }

    const selectIdentity = (id: string) => {
        selectedIdentityId.value = id
    }

    const reset = () => {
        discoveryResults.value = []
        selectedIdentityId.value = null
        discoveryError.value = null
        progress.value = null
        isSearching.value = false
    }

    // ADD THESE 2 FUNCTIONS:
    const initialize = () => {
        // Initialize store from localStorage or other persistent storage
        try {
            const savedWords = localStorage.getItem('connect_seed_words')
            if (savedWords) {
                const saved = JSON.parse(savedWords)
                if (saved.wordCount && (saved.wordCount === '12' || saved.wordCount === '24')) {
                    wordCount.value = saved.wordCount
                }
                if (Array.isArray(saved.words)) {
                    const newLength = parseInt(wordCount.value)
                    words.value = [
                        ...saved.words.slice(0, newLength),
                        ...Array(Math.max(0, newLength - saved.words.length)).fill('')
                    ]
                }
            }
        } catch (e) {
            // If parsing fails, use defaults
        }
    }

    const cleanup = () => {
        // Clean up resources - save to localStorage
        try {
            localStorage.setItem('connect_seed_words', JSON.stringify({
                wordCount: wordCount.value,
                words: words.value
            }))
        } catch (e) {
            // Ignore storage errors
        }
    }

    // Watch the debounced value correctly
    watch(() => debouncedPhrase.value, (newPhrase) => {
        if (newPhrase && newPhrase.trim() && isFilled.value) {
            discover(newPhrase)
        }
    })

    return {
        // State
        wordCount,
        words,
        discoveryResults,
        selectedIdentityId,
        discoveryError,
        isSearching,
        progress,

        // Computed
        requiredCount,
        isFilled,
        phrase,

        // Actions
        setWordCount,
        handlePaste,
        discover,
        selectIdentity,
        reset,
        initialize,  // ADDED
        cleanup      // ADDED
    }
})
