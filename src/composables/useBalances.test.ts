// src/composables/useBalances.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useBalances } from './useBalances'
import { useWalletStore } from '@/stores/wallet'
import { usePlatform } from './usePlatform'
vi.mock('./usePlatform')
vi.mock('@/stores/wallet')
describe('useBalances Composable', () => {
    let mockWallet: any
    let mockPlatform: any
    let mockSdk: any
    beforeEach(() => {
        vi.clearAllMocks()
        mockSdk = {
            identities: {
                getIdentityBalance: vi.fn().mockResolvedValue(5000n)
            }
        }
        mockPlatform = {
            getSDK: vi.fn().mockResolvedValue(mockSdk)
        }
        mockWallet = {
            assets: [
                { symbol: 'DASH', balance: 1.5, decimals: 8 }
            ],
            user: { displayName: 'Test User' }
        }
        vi.mocked(usePlatform).mockReturnValue(mockPlatform)
        vi.mocked(useWalletStore).mockReturnValue(mockWallet)
        vi.spyOn(console, 'log').mockImplementation(() => {})
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    it('should compute atomic balances using Math.floor as per source', async () => {
        const { fetchLiveBalances } = useBalances()
        await fetchLiveBalances('id_123')
        const logArgs = vi.mocked(console.log).mock.calls[0]
        const dashToken = logArgs?.[1].tokenBalances[0]
        // Source: BigInt(Math.floor(1.5)) * 10^8
        // Result: BigInt(1) * 10^8 = 100,000,000
        expect(dashToken.balance).toBe('100000000')
    })
    it('should throw and log error if fetch fails', async () => {
        const { fetchLiveBalances } = useBalances()
        mockSdk.identities.getIdentityBalance.mockRejectedValue(new Error('Network Fail'))
        const act = () => fetchLiveBalances('id_123')
        await expect(act()).rejects.toThrow('Network Fail')
        expect(console.error).toHaveBeenCalled()
    })
})
