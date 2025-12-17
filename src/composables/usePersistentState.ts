// src/composables/usePersistentState.ts

import { ref, watch } from 'vue'
import { StoreManager } from '@/utils/store'

export function usePersistentState<T>(
  key: string,
  store: 'assets' | 'identity' | 'license' | 'mnemonic' | 'keys' | 'settings',
  defaultValue: T,
  options?: {
    serializer?: (value: T) => string
    deserializer?: (value: string) => T
  }
) {
  const serializer = options?.serializer || JSON.stringify
  const deserializer = options?.deserializer || JSON.parse

  const state = ref<T>(defaultValue)

  // Load initial state
  StoreManager.load(store, key).then(saved => {
    if (saved !== null) {
      state.value = saved
    }
  }).catch(console.error)

  // Save on change with debounce
  let saveTimeout: ReturnType<typeof setTimeout>
  watch(state, (newValue) => {
    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      StoreManager.save(store, key, newValue).catch(console.error)
    }, 500)
  }, { deep: true })

  return state
}
