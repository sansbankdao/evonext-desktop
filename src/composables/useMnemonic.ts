// src/composables/useMnemonic.ts

import { invoke } from '@/utils/tauri'
import { ref } from 'vue'
import * as bip39 from 'bip39'

// --- Existing Backend/Singleton Logic ---
class MnemonicManager {
    private static instance: MnemonicManager
    private mnemonic: string | null = null

    private constructor() {}

    static getInstance(): MnemonicManager {
        if (!MnemonicManager.instance) {
            MnemonicManager.instance = new MnemonicManager()
        }
        return MnemonicManager.instance
    }

    async getMnemonic(network: 'mainnet' | 'testnet' = 'testnet'): Promise<string | null> {
        if (this.mnemonic !== null) return this.mnemonic
        try {
            const result = await invoke<{ seedPhrase: string } | null>('load_mnemonic', { network })
            this.mnemonic = result?.seedPhrase || null
            return this.mnemonic
        } catch (err) {
            console.error('[MnemonicManager] Fetch failed:', err)
            return null
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

// --- NEW: UI Validation Logic (Refactored from ConnectSeedForm) ---

export function useMnemonicValidator() {
    const wordlist = ref<string[]>([])
    const isReady = ref(false)

    // Initialize wordlist (call this on mount)
    const initWordlist = async () => {
        if (isReady.value) return
        const list = await bip39.wordlists.english
        if (Array.isArray(list)) {
            wordlist.value = list
            isReady.value = true
        }
    }

    const isValidWord = (word?: string): boolean => {
        if (!word || !word.trim() || wordlist.value.length === 0) return false
        return wordlist.value.includes(word.trim().toLowerCase())
    }

    const getSuggestions = (input: string, max = 5): string[] => {
        const clean = input.toLowerCase().trim()
        if (wordlist.value.length === 0 || clean.length < 2) return []
        return wordlist.value
            .filter(w => w.startsWith(clean) && w !== clean)
            .slice(0, max)
    }

    const validatePhrase = (words: string[], expectedLength: number) => {
        // Basic length check
        const cleanWords = words.map(w => w.trim().toLowerCase()).filter(w => w.length > 0)
        if (cleanWords.length !== expectedLength) {
            return { isValid: false, error: 'Incorrect number of words' }
        }

        // Check each word is in the wordlist first
        if (wordlist.value.length > 0) {
            const invalidWord = cleanWords.find(w => !wordlist.value.includes(w))
            if (invalidWord) {
                return { isValid: false, error: `Invalid word: "${invalidWord}"` }
            }
        }

        // Full checksum check — bip39 v3.x requires wordlist parameter
        const phrase = cleanWords.join(' ')
        const isValid = bip39.validateMnemonic(phrase, bip39.wordlists.english)
        if (!isValid) {
            return { isValid: false, error: 'Invalid checksum' }
        }

        return { isValid: true, error: '' }
    }

    return {
        wordlist,
        initWordlist,
        isValidWord,
        getSuggestions,
        validatePhrase
    }
}
