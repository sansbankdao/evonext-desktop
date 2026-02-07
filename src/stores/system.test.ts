// src/stores/system.test.ts

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSystemStore } from './system'

describe('System Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.stubGlobal('fetch', vi.fn())
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.restoreAllMocks()
        vi.useRealTimers()
    })

    it('should fetch dash price and update state', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                quote: { USD: { price: 35.5, pctChg24h: 5.2 } }
            })
        } as Response)

        const store = useSystemStore()
        await store.fetchDashPrice()

        expect(store.dashPrice).toBe(35.5)
        expect(store.currentDashPrice).toBe(35.5)
        expect(store.isPricePositive).toBe(true)
    })

    it('should handle fetch failure and use fallback', async () => {
        vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 } as Response)

        const store = useSystemStore()
        await store.fetchDashPrice()

        expect(store.error).toContain('500')
        expect(store.currentDashPrice).toBe(25)
    })

    it('should trigger updates on interval', async () => {
        vi.mocked(fetch).mockResolvedValue({
            ok: true,
            json: async () => ({
                quote: { USD: { price: 30, pctChg24h: 1.0 } }
            })
        } as Response)

        const store = useSystemStore()

        // At this point, fetch was called once because startPriceUpdates()
        // runs automatically on store instantiation.
        expect(fetch).toHaveBeenCalledTimes(1)

        // Advance time to trigger the interval
        vi.advanceTimersByTime(31000)

        // Verify global fetch was called again
        expect(fetch).toHaveBeenCalledTimes(2)

        store.stopPriceUpdates()
    })
})
