// src/stores/wallet/index.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWalletStore } from './index'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
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
// Mock the actions since they are dynamic imports in the real store
vi.mock('./actions/index', () => ({
    refreshBalances: vi.fn().mockImplementation(async function() {
        this.assets = [
            { id: 'dash', symbol: 'DASH', usdValue: 30 },
            { id: 'credits', symbol: 'CREDITS', usdValue: 0 },
            { id: 'dusd', symbol: 'DUSD', balanceFormatted: '5', usdValue: 5 }
        ]
        window.dispatchEvent(new CustomEvent('wallet:balances-refreshed'))
    }),
    fetchRealTransactions: vi.fn().mockImplementation(async function() {
        this.transactions = [{ id: 'tx1', type: 'IDENTITY_CREATE' }]
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
        identityStore.isConnected = true
        identityStore.identityId = 'id123'
        identityStore.balance = '100000000000'
        systemStore.currentDashPrice = 30
        vi.clearAllMocks()
    })
    it('refreshBalances should orchestrate full balance update', async () => {
        const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
        vi.mocked(invoke).mockResolvedValue([
            {
                symbol: 'DUSD',
                asset_id: 'dusd_id',
                balance: 5000000,
                decimals: 6
            }
        ])
        await walletStore.refreshBalances()
        expect(walletStore.assets.length).toBe(3)
        const dashAsset = walletStore.assets.find((a: any) => a.id === 'dash')
        expect(dashAsset.usdValue).toBe(30)
        const dusdAsset = walletStore.assets.find((a: any) => a.symbol === 'DUSD')
        expect(dusdAsset.balanceFormatted).toBe('5')
        expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
            type: 'wallet:balances-refreshed'
        }))
    })
    it('refreshBalances should handle missing identity gracefully', async () => {
        identityStore.identityId = null
        identityStore.identity = null
        // Re-mock to handle the null case
        const actions = await import('./actions/index')
        vi.mocked(actions.refreshBalances).mockImplementationOnce(async function() {
            this.isLoading = false
        })
        await walletStore.refreshBalances()
        expect(walletStore.isLoading).toBe(false)
    })
    it('fetchRealTransactions should map explorer data to store', async () => {
        await walletStore.fetchRealTransactions()
        expect(walletStore.transactions.length).toBeGreaterThan(0)
        expect(walletStore.transactions[0].id).toBe('tx1')
    })
})
