// src/stores/wallet/index.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWalletStore } from './index'
import { useIdentityStore } from '@/stores/identity'
import { useSystemStore } from '@/stores/system'
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
// Mocking the dynamic action modules used in the store actions
vi.mock('./actions/index', () => ({
    fetchLiveBalances: vi.fn().mockImplementation(async function(this: any) {
        this.assets = [{ symbol: 'DASH', usdValue: 30 }]
    }),
    fetchRealTransactions: vi.fn().mockImplementation(async function(this: any) {
        this.transactions = [{ id: 'tx1' }]
    }),
    refreshBalances: vi.fn().mockImplementation(async function(this: any) {
        this.assets = [{ symbol: 'DASH', usdValue: 30 }]
        window.dispatchEvent(new CustomEvent('wallet:balances-refreshed'))
    })
}))
// Mocking the API actions module
vi.mock('./actions/api', () => ({
    fetchTokenBalance: vi.fn().mockResolvedValue(5000000n)
}))
describe('Wallet Store Complete Suite', () => {
    let walletStore: any
    let identityStore: any
    let systemStore: any
    beforeEach(() => {
        setActivePinia(createPinia())
        walletStore = useWalletStore()
        identityStore = useIdentityStore()
        systemStore = useSystemStore()
        // Setup default store states
        identityStore.isConnected = true
        identityStore.identityId = 'id123'
        systemStore.currentDashPrice = 30
        vi.clearAllMocks()
    })
    describe('Getters', () => {
        it('totalUsdValue should sum assets correctly', () => {
            walletStore.assets = [
                { symbol: 'DASH', usdValue: 100 },
                { symbol: 'DUSD', usdValue: 50 },
                { symbol: 'FREE' }
            ]
            expect(walletStore.totalUsdValue).toBe(150)
        })
        it('getAssetByTicker should match directly and with "t" prefix fallback', () => {
            walletStore.assets = [
                { symbol: 'USDC' },
                { symbol: 'tDASH' }
            ]
            // Direct match
            expect(walletStore.getAssetByTicker('USDC').symbol).toBe('USDC')
            // Variant match (tDASH for DASH)
            expect(walletStore.getAssetByTicker('DASH').symbol).toBe('tDASH')
            // No match
            expect(walletStore.getAssetByTicker('BTC')).toBeUndefined()
        })
    })
    describe('Actions', () => {
        it('fetchLiveBalances should trigger dynamic import action', async () => {
            await walletStore.fetchLiveBalances()
            expect(walletStore.assets).toHaveLength(1)
        })
        it('fetchRealTransactions should trigger dynamic import action', async () => {
            await walletStore.fetchRealTransactions(10)
            expect(walletStore.transactions).toHaveLength(1)
        })
        it('refreshBalances should update assets and dispatch event', async () => {
            const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
            await walletStore.refreshBalances()
            expect(walletStore.assets).toBeDefined()
            expect(dispatchSpy).toHaveBeenCalled()
        })
        it('getTokenBalance should convert raw values to BigInt', async () => {
            const balance = await walletStore.getTokenBalance('id', 'contract')
            expect(typeof balance).toBe('bigint')
            expect(balance).toBe(5000000n)
        })
        it('init should set user and refresh', async () => {
            const user = { label: 'Alice', identityId: 'id1' } as any
            await walletStore.init(user)
            expect(walletStore.user).toEqual(user)
        })
        it('clear should reset state', () => {
            walletStore.assets = [{ symbol: 'DASH' }] as any
            walletStore.clear()
            expect(walletStore.assets).toHaveLength(0)
            expect(walletStore.user).toBeNull()
        })
        it('fromSatoshi should handle number and bigint', () => {
            expect(walletStore.fromSatoshi(100000000)).toBe(1)
            expect(walletStore.fromSatoshi(200000000n)).toBe(2)
        })
    })
})
