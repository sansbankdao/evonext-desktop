// src/stores/identity/actions/mnemonic.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mnemonicActions } from './mnemonic'
import { commands } from '@/bindings'

vi.mock('@/bindings', () => ({
    commands: {
        saveMnemonic: vi.fn(),
        loadMnemonic: vi.fn(),
        deleteMnemonic: vi.fn()
    }
}))

vi.mock('./identity', () => ({
    normalizeResult: vi.fn((res: any) => {
        // Handle explicit success: false
        if (res?.success === false) {
            return {
                success: false,
                data: null,
                error: { message: res?.error || 'Unknown error' }
            }
        }
        // Handle explicit success: true (regardless of data)
        if (res?.success === true) {
            return {
                success: true,
                data: res?.data ?? null,
                error: null
            }
        }
        // Handle status-based success
        if (res?.status === 'success' || res?.status === 'ok') {
            return {
                success: true,
                data: res?.data ?? null,
                error: null
            }
        }
        // Handle data presence as implicit success
        const hasData = res?.data !== null && res?.data !== undefined
        if (hasData) {
            return {
                success: true,
                data: res?.data,
                error: null
            }
        }
        // Default to failure
        return {
            success: false,
            data: null,
            error: { message: res?.error || 'Unknown error' }
        }
    })
}))

describe('mnemonicActions', () => {
    const actions = mnemonicActions()
    const mockState = {} as any

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('saveMnemonicToStore', () => {
        it('should save mnemonic to Rust backend successfully', async () => {
            vi.mocked(commands.saveMnemonic).mockResolvedValue({
                success: true,
                data: null,
                error: null
            })

            const result = await actions.saveMnemonicToStore.call(mockState, 'testnet', 'word '.repeat(12).trim())
            expect(result.success).toBe(true)
            expect(commands.saveMnemonic).toHaveBeenCalledWith('testnet', {
                seedPhrase: 'word '.repeat(12).trim()
            })
        })

        it('should return error on backend failure', async () => {
            vi.mocked(commands.saveMnemonic).mockResolvedValue({
                success: false,
                data: null,
                error: 'Disk full'
            })

            const result = await actions.saveMnemonicToStore.call(mockState, 'testnet', 'test phrase')
            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
        })

        it('should handle thrown exceptions', async () => {
            vi.mocked(commands.saveMnemonic).mockRejectedValue(new Error('Connection lost'))

            const result = await actions.saveMnemonicToStore.call(mockState, 'testnet', 'test phrase')
            expect(result.success).toBe(false)
            expect(result.error).toContain('Connection lost')
        })
    })

    describe('loadMnemonicFromStore', () => {
        it('should load mnemonic from Rust backend', async () => {
            vi.mocked(commands.loadMnemonic).mockResolvedValue({
                success: true,
                data: { seedPhrase: 'loaded phrase' },
                error: null
            })

            const result = await actions.loadMnemonicFromStore.call(mockState, 'testnet')
            expect(result.success).toBe(true)
            expect(result.data).toBe('loaded phrase')
        })

        it('should return error when no mnemonic found', async () => {
            vi.mocked(commands.loadMnemonic).mockResolvedValue({
                success: true,
                data: null,
                error: null
            })

            const result = await actions.loadMnemonicFromStore.call(mockState, 'testnet')
            expect(result.success).toBe(false)
        })

        it('should handle thrown exceptions', async () => {
            vi.mocked(commands.loadMnemonic).mockRejectedValue(new Error('File locked'))

            const result = await actions.loadMnemonicFromStore.call(mockState, 'testnet')
            expect(result.success).toBe(false)
            expect(result.error).toContain('File locked')
        })
    })

    describe('deleteMnemonicFromStore', () => {
        it('should delete mnemonic successfully', async () => {
            vi.mocked(commands.deleteMnemonic).mockResolvedValue({
                success: true,
                data: null,
                error: null
            })

            const result = await actions.deleteMnemonicFromStore.call(mockState, 'testnet')
            expect(result.success).toBe(true)
        })

        it('should handle deletion failure', async () => {
            vi.mocked(commands.deleteMnemonic).mockRejectedValue(new Error('Permission denied'))

            const result = await actions.deleteMnemonicFromStore.call(mockState, 'testnet')
            expect(result.success).toBe(false)
            expect(result.error).toContain('Permission denied')
        })
    })
})
