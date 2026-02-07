// src/composables/usePersistentState.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { usePersistentState } from './usePersistentState'
import { StoreManager } from '@/utils/store'
vi.mock('@/utils/store', () => ({
    StoreManager: {
        load: vi.fn(),
        save: vi.fn(() => Promise.resolve())
    }
}))
describe('usePersistentState', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers()
    })
    it('should load initial state from StoreManager', async () => {
        const savedValue = { theme: 'dark' }
        vi.mocked(StoreManager.load).mockResolvedValue(savedValue)
        const state = usePersistentState('settings', { theme: 'light' })
        // Initial value check
        expect(state.value).toEqual({ theme: 'light' })
        // Process the load promise
        await vi.runAllTimersAsync()
        await nextTick()
        expect(StoreManager.load).toHaveBeenCalledWith('settings')
        expect(state.value).toEqual(savedValue)
    })
    it('should save to StoreManager with debounce on change', async () => {
        vi.mocked(StoreManager.load).mockResolvedValue(null)
        const state = usePersistentState('settings', 'initial')
        state.value = 'new-value'
        await nextTick()
        expect(StoreManager.save).not.toHaveBeenCalled()
        vi.advanceTimersByTime(500)
        expect(StoreManager.save).toHaveBeenCalledWith('settings', 'new-value')
    })
    it('should handle load errors gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
        vi.mocked(StoreManager.load).mockRejectedValue(new Error('Load Failed'))
        usePersistentState('settings', 'default')
        await vi.runAllTimersAsync()
        await nextTick()
        expect(consoleSpy).toHaveBeenCalled()
        consoleSpy.mockRestore()
    })
})
