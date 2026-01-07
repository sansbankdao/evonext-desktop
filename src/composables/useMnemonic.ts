// src/composables/useMnemonic.ts

import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'

// Simple caching singleton
class MnemonicManager {
    private static instance: MnemonicManager
    private mnemonic: string | null = null
    private loading = false
    private error: string | null = null

    private constructor() {}

    static getInstance(): MnemonicManager {
        if (!MnemonicManager.instance) {
            MnemonicManager.instance = new MnemonicManager()
        }
        return MnemonicManager.instance
    }

    async getMnemonic(): Promise<string | null> {
        if (this.mnemonic !== null) {
            return this.mnemonic
        }

        this.loading = true
        this.error = null

        try {
            console.log('Fetching mnemonic from Tauri backend...')
            const result = await invoke<string>('load_mnemonic')
            this.mnemonic = result || null
            console.log('Mnemonic retrieved:', this.mnemonic ? 'Yes (hidden)' : 'No')
            return this.mnemonic
        } catch (err: any) {
            console.error('Failed to get mnemonic:', err)
            this.error = err.message || 'Failed to retrieve mnemonic'
            return null
        } finally {
            this.loading = false
        }
    }

    clearMnemonic(): void {
        this.mnemonic = null
        this.error = null
    }

    async hasMnemonic(): Promise<boolean> {
        const mnem = await this.getMnemonic()
        return !!mnem
    }

    getState() {
        return {
            mnemonic: this.mnemonic,
            loading: this.loading,
            error: this.error
        }
    }
}

// Export singleton instance
export const mnemonicManager = MnemonicManager.getInstance()

// Vue composable version (if you need reactivity)
export function useMnemonic() {
    const mnemonicRef = ref<string | null>(mnemonicManager.getState().mnemonic)
    const loadingRef = ref(mnemonicManager.getState().loading)
    const errorRef = ref<string | null>(mnemonicManager.getState().error)

    const getMnemonic = async (): Promise<string | null> => {
        loadingRef.value = true
        errorRef.value = null

        try {
            const result = await mnemonicManager.getMnemonic()
            mnemonicRef.value = result
            return result
        } finally {
            loadingRef.value = false
        }
    }

    const clearMnemonic = () => {
        mnemonicManager.clearMnemonic()
        mnemonicRef.value = null
        errorRef.value = null
    }

    const hasMnemonic = async (): Promise<boolean> => {
        const mnem = await getMnemonic()
        return !!mnem
    }

    return {
        mnemonic: mnemonicRef,
        loading: loadingRef,
        error: errorRef,
        getMnemonic,
        clearMnemonic,
        hasMnemonic
    }
}
