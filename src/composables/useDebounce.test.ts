// src/composables/useDebounce.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { useDebounce } from './useDebounce'
describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })
    afterEach(() => {
        vi.restoreAllMocks()
    })
    it('should initialize with the source value', () => {
        const source = ref('initial')
        const debounced = useDebounce(source)
        expect(debounced.value).toBe('initial')
    })
    it('should update value after delay', async () => {
        const source = ref('initial')
        const debounced = useDebounce(source, 500)
        source.value = 'updated'
        // Wait for Vue watcher to trigger the update function
        await nextTick()
        // Should not update immediately
        vi.advanceTimersByTime(250)
        expect(debounced.value).toBe('initial')
        // Should update after delay
        vi.advanceTimersByTime(250)
        expect(debounced.value).toBe('updated')
    })
    it('should cancel previous timer on rapid changes', async () => {
        const source = ref('v1')
        const debounced = useDebounce(source, 500)
        source.value = 'v2'
        await nextTick()
        vi.advanceTimersByTime(300)
        source.value = 'v3'
        await nextTick()
        vi.advanceTimersByTime(300)
        // v2 should never have been set
        expect(debounced.value).toBe('v1')
        vi.advanceTimersByTime(200)
        expect(debounced.value).toBe('v3')
    })
    it('should clean up timeout on unmount', async () => {
        const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
        // Mock onUnmounted to trigger immediately for test
        vi.mock('vue', async () => {
            const actual = await vi.importActual('vue') as any
            return {
                ...actual,
                onUnmounted: (cb: any) => cb()
            }
        })
        const source = ref('test')
        useDebounce(source, 500)
        source.value = 'changed'
        await nextTick()
        expect(clearTimeoutSpy).toHaveBeenCalled()
    })
})
