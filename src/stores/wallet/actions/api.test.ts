// src/stores/wallet/actions/api.test.ts

import { setActivePinia, createPinia } from 'pinia'
import { useWalletStore } from '../index'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/env', () => ({
    PLATFORM_HTTP_API_MAINNET: 'https://mainnet-mock.api',
    PLATFORM_HTTP_API_TESTNET: 'https://testnet-mock.api',
}))

describe('Wallet Store (API Actions)', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.restoreAllMocks()
    })

    it('fetches token balance via store action and converts to BigInt', async () => {
        const store = useWalletStore()

        // Mock the global fetch that fetchTokenBalance uses
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ balance: '123450000000' })
        })

        // @ts-ignore
        global.fetch = mockFetch

        const result = await store.getTokenBalance('testIdentity', 'testContract')

        // Now result IS the bigint, not a wrapper
        expect(result).toBe(123450000000n)

        expect(mockFetch).toHaveBeenCalled()
    })

    it('handles network errors gracefully', async () => {
        const store = useWalletStore()

        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404
        })

        // @ts-ignore
        global.fetch = mockFetch

        // Since we removed ErrorBoundary.wrap in favor of throwing, we expect a rejection
        await expect(store.getTokenBalance('bad', 'id'))
            .rejects.toThrow('Failed to fetch balance for id: 404')
    })
})
