// src/composables/useMnemonic.ts

import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'

export function useMnemonic() {
    const mnemonic = ref<string | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    const getMnemonic = async (): Promise<string | null> => {
        if (mnemonic.value !== null) {
            return mnemonic.value
        }

        loading.value = true
        error.value = null

        try {
            const result = await invoke<string>('get_mnemonic')
            mnemonic.value = result || null
            return mnemonic.value
        } catch (err) {
            console.error('Failed to get mnemonic:', err)
            error.value = err instanceof Error ? err.message : 'Failed to retrieve mnemonic'
            return null
        } finally {
            loading.value = false
        }
    }

    const clearMnemonic = () => {
        mnemonic.value = null
        error.value = null
    }

    const hasMnemonic = async (): Promise<boolean> => {
        const mnem = await getMnemonic()
        return !!mnem
    }

    return {
        mnemonic: mnemonic,
        getMnemonic,
        clearMnemonic,
        hasMnemonic,
        loading,
        error
    }
}

// Singleton instance for easier use
export const mnemonicManager = useMnemonic()
