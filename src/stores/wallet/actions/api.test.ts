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

        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ balance: '123450000000' })
        })

        // @ts-ignore
        global.fetch = mockFetch

        const result = await store.getTokenBalance('testIdentity', 'testContract')

        // Assert the result matches the ActionResponse pattern
        expect(result.success).toBe(true)
        expect(result.data).toBe(123450000000n)

        expect(mockFetch).toHaveBeenCalled()
        const callUrl = mockFetch.mock.calls[0][0]
        expect(callUrl).toContain('identity/testIdentity/tokens/testContract/balance')
    })

    it('handles network errors gracefully (404)', async () => {
        const store = useWalletStore()

        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404
        })

        // @ts-ignore
        global.fetch = mockFetch

        // The store now uses ErrorBoundary, so it returns success: false instead of throwing
        const result = await store.getTokenBalance('bad', 'id')

        expect(result.success).toBe(false)
        expect(result.error).toContain('Failed to fetch balance for id: 404')
        expect(result.code).toBe('FETCH_TOKEN_BALANCE_FAILED')
    })
})
