// src/composables/useMnemonic.test.ts

import { describe, it, expect, vi } from 'vitest'
import { useMnemonic, useMnemonicValidator } from './useMnemonic'
import { invoke } from '@/utils/tauri'

vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))

vi.mock('bip39', async () => {
    const actual = await vi.importActual('bip39') as any
    return {
        ...actual,
        validateMnemonic: vi.fn().mockReturnValue(true)
    }
})

describe('useMnemonic', () => {
    it('should invoke generate command', async () => {
        vi.mocked(invoke).mockResolvedValue('word '.repeat(12).trim())
        const { generateNewMnemonic } = useMnemonic()
        const m = await generateNewMnemonic()
        expect(m).toBeDefined()
        expect(invoke).toHaveBeenCalledWith('generate_new_mnemonic')
    })

    describe('useMnemonicValidator', () => {
        const validator = useMnemonicValidator()

        it('should identify valid words after init', async () => {
            // Mock wordlist
            validator.wordlist.value = ['apple', 'banana', 'cherry']
            expect(validator.isValidWord('apple')).toBe(true)
            expect(validator.isValidWord('pizza')).toBe(false)
        })

        it('should provide suggestions', () => {
            validator.wordlist.value = ['apple', 'apply', 'abandon']
            const suggs = validator.getSuggestions('app')
            expect(suggs).toContain('apple')
            expect(suggs).toContain('apply')
        })

        it('should validate full phrases', () => {
            const result = validator.validatePhrase(['word'], 12)
            expect(result.isValid).toBe(false)
            expect(result.error).toBe('Incorrect number of words')
        })
    })
})
