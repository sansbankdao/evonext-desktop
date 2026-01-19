import { setActivePinia, createPinia } from 'pinia'
import { useWalletStore } from '../index'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// 1. Mock the environment variables to prevent "undefined" URL errors
// We mock the module that provides the API URLs
vi.mock('@/utils/env', () => ({
    PLATFORM_HTTP_API_MAINNET: 'https://mainnet-mock.api',
    PLATFORM_HTTP_API_TESTNET: 'https://testnet-mock.api',
}))

describe('Wallet Store (API Actions)', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        // Reset mocks before each test to ensure isolation
        vi.restoreAllMocks()
    })

    it('fetches token balance via store action and converts to BigInt', async () => {
        const store = useWalletStore()

        // 2. Mock global fetch to simulate the Explorer API response
        // Your api.ts returns data.resultSet or data, and data.balance or data
        const mockFetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ balance: '123450000000' }) // API returns a string representation
        })

        // @ts-ignore
        global.fetch = mockFetch

        // 3. Call the ACTUAL function that exists in your store
        const result = await store.getTokenBalance('testIdentity', 'testContract')

        // 4. Assert the result is converted correctly to BigInt
        expect(result).toBe(123450000000n)

        // 5. Verify the fetch was called with the constructed URL
        expect(mockFetch).toHaveBeenCalled()

        // The URL should look like: https://testnet-mock.api/identity/testIdentity/tokens/testContract/balance
        const callUrl = mockFetch.mock.calls[0][0]
        expect(callUrl).toContain('identity/testIdentity/tokens/testContract/balance')
    })

    it('handles network errors gracefully (404)', async () => {
        const store = useWalletStore()

        // Mock a 404 response
        const mockFetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 404
        })

        // @ts-ignore
        global.fetch = mockFetch

        // We expect the promise to be rejected with a NetworkError defined in your utils
        // Note: If you haven't wrapped this in a try/catch inside your test, it might fail the suite uncaught
        await expect(
            store.getTokenBalance('bad', 'id')
        ).rejects.toThrow('Failed to fetch balance for id: 404')
    })
})
