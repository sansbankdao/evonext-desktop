// src/utils/store.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StoreManager } from './store'

const mockInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/tauri', () => ({
    invoke: mockInvoke
}))

// Mock ErrorBoundary to just execute the function
vi.mock('./errors', () => ({
    ErrorBoundary: {
        wrap: vi.fn((fn) => fn())
    }
}))

describe('StoreManager infrastructure', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('load', () => {
        it('prefixes the command and unwraps data', async () => {
            mockInvoke.mockResolvedValue({ status: 'ok', data: { theme: 'dark' } })
            const result = await StoreManager.load<any>('settings')

            expect(mockInvoke).toHaveBeenCalledWith('load_settings')
            expect(result.theme).toBe('dark')
        })

        it('throws when the response indicates failure', async () => {
            mockInvoke.mockResolvedValue({ success: false, error: 'IO Error' })
            await expect(StoreManager.load('identity')).rejects.toThrow('IO Error')
        })
    })

    describe('save', () => {
        it('passes the data as a payload object', async () => {
            mockInvoke.mockResolvedValue({ status: 'ok' })
            const data = { seedPhrase: 'test' }
            await StoreManager.save('mnemonic', data)

            expect(mockInvoke).toHaveBeenCalledWith('save_mnemonic', { payload: data })
        })
    })

    describe('delete and fallbacks', () => {
        it('falls back to getEmptyData if the delete command fails', async () => {
            // First invoke (delete) fails
            mockInvoke.mockRejectedValueOnce(new Error('Delete blocked'))
            // Second invoke (save fallback) succeeds
            mockInvoke.mockResolvedValueOnce({ status: 'ok' })

            await StoreManager.delete('settings')

            // Should have attempted to save empty settings
            expect(mockInvoke).toHaveBeenCalledWith('save_settings', {
                payload: { theme: 'system', network: 'testnet' }
            })
        })
    })

    describe('remove', () => {
        it('calls the generic remove_store command', async () => {
            mockInvoke.mockResolvedValue({ status: 'ok' })
            await StoreManager.remove('assets')
            expect(mockInvoke).toHaveBeenCalledWith('remove_store', { store: 'assets' })
        })
    })
})
