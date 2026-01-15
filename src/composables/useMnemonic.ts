// src/composables/useMnemonic.ts
import { invoke } from '@tauri-apps/api/core'
import { ref } from 'vue'
class MnemonicManager {
    private static instance: MnemonicManager
    private mnemonic: string | null = null
    // private loading = false
    private constructor() {}
    static getInstance(): MnemonicManager {
        if (!MnemonicManager.instance) {
            MnemonicManager.instance = new MnemonicManager()
        }
        return MnemonicManager.instance
    }
    async getMnemonic(network: 'mainnet' | 'testnet' = 'testnet'): Promise<string | null> {
        if (this.mnemonic !== null) return this.mnemonic
        // this.loading = true
        try {
            // payload matches Rust: load_mnemonic(network: String)
            const result = await invoke<{ seedPhrase: string } | null>('load_mnemonic', { network })
            this.mnemonic = result?.seedPhrase || null
            return this.mnemonic
        } catch (err) {
            console.error('[MnemonicManager] Fetch failed:', err)
            return null
        } finally {
            // this.loading = false
        }
    }
    async hasMnemonic(network: 'mainnet' | 'testnet' = 'testnet'): Promise<boolean> {
        const mnem = await this.getMnemonic(network)
        return !!mnem
    }
    clearMnemonic(): void {
        this.mnemonic = null
    }
}
export const mnemonicManager = MnemonicManager.getInstance()
export function useMnemonic() {
    const loading = ref(false)
    const generateNewMnemonic = async (): Promise<string> => {
        loading.value = true
        try {
            // Calls Rust command to generate and return a new BIP39 phrase
            return await invoke<string>('generate_new_mnemonic')
        } finally {
            loading.value = false
        }
    }
    return {
        generateNewMnemonic,
        getMnemonic: mnemonicManager.getMnemonic.bind(mnemonicManager),
        hasMnemonic: mnemonicManager.hasMnemonic.bind(mnemonicManager),
        loading
    }
}
