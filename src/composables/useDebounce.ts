// src/composables/useDebounce.ts

import { ref, watch, onUnmounted, type WatchSource } from 'vue'

/**
 * Debounces a reactive value with automatic cleanup.
 *
 * @param source - Reactive value to debounce (can be ref, computed, or getter)
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns A reactive object with `value` property containing the debounced value
 */
export function useDebounce<T>(
    source: WatchSource<T> | (() => T),
    delay = 300
): { value: T } {
    // Initialize with current source value
    const initialValue = typeof source === 'function'
        ? source()
        : (source as { value: T }).value

    const debouncedValue = ref(initialValue) as { value: T }
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const updateDebouncedValue = (newValue: T) => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(() => {
            debouncedValue.value = newValue
        }, delay)
    }

    // Watch the source for changes
    watch(
        source,
        (newValue) => {
            updateDebouncedValue(newValue)
        },
        { immediate: true }
    )

    onUnmounted(() => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }
    })

    return debouncedValue
}

// Usage examples:
// 1. With a ref:
// const searchTerm = ref('')
// const debouncedSearchTerm = useDebounce(searchTerm, 500)
//
// 2. With a getter:
// const phrase = computed(() => words.value.join(' '))
// const debouncedPhrase = useDebounce(() => phrase.value, 500)
//
// 3. Watch the debounced value:
// watch(() => debouncedSearchTerm.value, (newVal) => { ... })
