// src/composables/useMnemonic.ts

import { invoke } from '@/utils/tauri'
import { ref } from 'vue'
import * as bip39 from 'bip39'
// Explicitly import English wordlist to prevent tree-shaking issues
// bip39 v3.x requires this for ESM/Vite bundler compatibility
import { wordlists } from 'bip39'
const englishWordlist: string[] = wordlists.english || (bip39 as any).wordlists?.english || []

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
        // Use the pre-resolved English wordlist from module scope
        // This avoids issues with tree-shaking and async resolution
        if (englishWordlist.length > 0) {
            wordlist.value = englishWordlist
            isReady.value = true
            return
        }
        // Fallback: try accessing bip39.wordlists.english directly
        try {
            const list = bip39.wordlists?.english || (await (bip39 as any).wordlists?.english)
            if (Array.isArray(list) && list.length > 0) {
                wordlist.value = list
                isReady.value = true
            } else {
                console.error('[MnemonicValidator] Failed to load English wordlist: empty or not an array')
            }
        } catch (e) {
            console.error('[MnemonicValidator] Failed to load English wordlist:', e)
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

        // Full checksum check — pass wordlist explicitly for bip39 v3.x compatibility
        const phrase = cleanWords.join(' ')
        const wl = wordlist.value.length > 0 ? wordlist.value : englishWordlist
        const isValid = wl.length > 0
            ? bip39.validateMnemonic(phrase, wl)
            : bip39.validateMnemonic(phrase)
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
