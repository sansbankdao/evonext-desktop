// src/stores/settings.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from './settings'

const mockInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/tauri', () => ({
    invoke: mockInvoke
}))

describe('Settings Pinia Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.clearAllMocks()
    })

    it('initializes with default values', () => {
        const store = useSettingsStore()
        expect(store.state.theme).toBe('system')
        expect(store.state.network).toBe('testnet')
    })

    it('loads settings from the backend', async () => {
        const store = useSettingsStore()
        mockInvoke.mockResolvedValue({ theme: 'light', network: 'mainnet' })

        await store.load()

        expect(store.state.theme).toBe('light')
        expect(store.state.network).toBe('mainnet')
        expect(store.state.isLoading).toBe(false)
    })

    it('updates specific settings and triggers a save', async () => {
        const store = useSettingsStore()
        mockInvoke.mockResolvedValue({ status: 'ok' })

        await store.setTheme('dark')

        expect(store.state.theme).toBe('dark')
        expect(mockInvoke).toHaveBeenCalledWith('save_settings', expect.objectContaining({
            settings: expect.objectContaining({ theme: 'dark' })
        }))
    })

    it('updates user profile partially', async () => {
        const store = useSettingsStore()
        mockInvoke.mockResolvedValue({ status: 'ok' })

        await store.updateProfile({ display_name: 'New Name' })

        expect(store.state.profile.display_name).toBe('New Name')
        expect(store.state.profile.bio).toBe('') // Preserved empty
    })

    it('handles errors during save gracefully', async () => {
        const store = useSettingsStore()
        mockInvoke.mockRejectedValue(new Error('Save Failed'))

        await expect(store.save()).rejects.toThrow('Save Failed')
        expect(store.state.error).toBe('Save Failed')
        expect(store.state.isLoading).toBe(false)
    })

    it('resets error state', () => {
        const store = useSettingsStore()
        store.state.error = 'Something went wrong'
        store.resetError()
        expect(store.state.error).toBe(null)
    })
})
