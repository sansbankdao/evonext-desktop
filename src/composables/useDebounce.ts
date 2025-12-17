// src/composables/useDebounce.ts

import { ref, watch, onUnmounted } from 'vue'

export function useDebounce<T>(value: T, delay = 300) {
  const debouncedValue = ref(value) as { value: T }
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const updateDebouncedValue = (newValue: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      debouncedValue.value = newValue
    }, delay)
  }

  watch(() => value, updateDebouncedValue, { immediate: true })

  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })

  return debouncedValue
}

// Usage in components:
// const searchTerm = ref('')
// const debouncedSearchTerm = useDebounce(searchTerm, 500)
