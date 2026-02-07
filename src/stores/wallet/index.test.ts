// src/stores/wallet/index.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWalletStore } from './index'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
import { refreshBalances, fetchRealTransactions } from './index'
import { invoke } from '@/utils/tauri'
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
vi.mock('./api', () => ({
    fetchIdentityTransactions: vi.fn().mockResolvedValue({
        success: true,
        data: [{ hash: 'tx1', type: 'IDENTITY_CREATE' }]
    })
}))
describe('Wallet Actions', () => {
    let walletStore: any
    let identityStore: any
    let systemStore: any
    beforeEach(() => {
        setActivePinia(createPinia())
        walletStore = useWalletStore()
        identityStore = useIdentityStore()
        systemStore = useSystemStore()
        // Setup base identity state
        identityStore.isConnected = true
        identityStore.identityId = 'id123'
        identityStore.balance = '100000000000' // 1 Dash worth of credits
        systemStore.currentDashPrice = 30
        vi.clearAllMocks()
    })
    it('refreshBalances should orchestrate full balance update', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
        // Mock token return
        vi.mocked(invoke).mockResolvedValue([
            {
                symbol: 'DUSD',
                asset_id: 'dusd_id',
                balance: 5000000, // 5.0 DUSD (6 decimals)
                decimals: 6
            }
        ])
        await refreshBalances.call(walletStore)
        // Verify assets created
        expect(walletStore.assets.length).toBe(3) // Credits, Dash, DUSD
        const dashAsset = walletStore.assets.find((a: any) => a.id === 'dash')
        expect(dashAsset.usdValue).toBe(30) // 1 Dash * $30
        const dusdAsset = walletStore.assets.find((a: any) => a.symbol === 'DUSD')
        expect(dusdAsset.balanceFormatted).toBe('5')
        expect(dusdAsset.usdValue).toBe(5) // 5 tokens * $1.0
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'wallet:balances-refreshed'
        }))
    })
    it('refreshBalances should handle missing identity gracefully', async () => {
        identityStore.identityId = null
        identityStore.identity = null
        await refreshBalances.call(walletStore)
        expect(walletStore.isLoading).toBe(false)
    })
    it('fetchRealTransactions should map explorer data to store', async () => {
        await fetchRealTransactions.call(walletStore)
        expect(walletStore.transactions.length).toBeGreaterThan(0)
        expect(walletStore.transactions[0].id).toBe('tx1')
    })
})
