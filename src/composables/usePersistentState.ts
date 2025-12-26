// src/composables/usePersistentState.ts

/* Import modules. */
import { ref, watch } from 'vue'
import { StoreManager } from '@/utils/store'

export function usePersistentState<T>(
    // key: string, // REMOVE this parameter since StoreManager doesn't use it anymore
    store: 'assets' | 'identity' | 'license' | 'mnemonic' | 'private_keys' | 'settings',
    defaultValue: T,
) {
    // Either use serializer/deserializer or remove them
    // const serializer = options?.serializer || JSON.stringify
    // const deserializer = options?.deserializer || JSON.parse

    const state = ref<T>(defaultValue)

    // Load initial state
    StoreManager.load(store).then(saved => {
    if (saved !== null) {
        state.value = saved
    }
    }).catch(console.error)

    // Save on change with debounce
    let saveTimeout: ReturnType<typeof setTimeout>

    watch(state, (newValue) => {
        clearTimeout(saveTimeout)

        saveTimeout = setTimeout(() => {
            StoreManager.save(store, newValue).catch(console.error)
        }, 500)
    }, { deep: true })

    return state
}
