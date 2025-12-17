// src/composables/usePersistentState.ts

import { ref, watch } from 'vue'
import { StoreManager } from '@/utils/store'

export function usePersistentState<T>(
  key: string,
  store: 'assets' | 'identity' | 'license' | 'mnemonic' | 'private_keys' | 'settings', // Note: 'keys' -> 'private_keys'
  defaultValue: T,
  options?: {
    serializer?: (value: T) => string
    deserializer?: (value: string) => T
  }
) {
  // Remove unused serializer/deserializer or use them
  const serializer = options?.serializer || JSON.stringify
  const deserializer = options?.deserializer || JSON.parse

  const state = ref<T>(defaultValue)

  // Load initial state
  StoreManager.load(store).then(saved => { // REMOVED: , key
    if (saved !== null) {
      state.value = saved
    }
  }).catch(console.error)

  // Save on change with debounce
  let saveTimeout: ReturnType<typeof setTimeout>
  watch(state, (newValue) => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      StoreManager.save(store, newValue).catch(console.error) // REMOVED: , key
    }, 500)
  }, { deep: true })

  return state
}
