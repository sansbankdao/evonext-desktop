// src/stores/identity/actions/balance.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { balanceActions } from './balance'
import { getIdentityBalance } from '@evonext/platform'
vi.mock('@evonext/platform', () => ({
    getIdentityBalance: vi.fn()
}))
vi.mock('@/composables', () => ({
    useNetwork: () => ({
        ensure: vi.fn().mockResolvedValue('testnet')
    })
}))
describe('balance.ts Store Actions', () => {
    let actions: any
    let mockStore: any
    beforeEach(() => {
        vi.clearAllMocks()
        actions = balanceActions()
        mockStore = {
            identity: { identityId: 'id_123', identityIdx: 0 },
            username: 'tester',
            balance: '0',
            saveIdentityDataToStore: vi.fn().mockResolvedValue(true),
            getCurrentNetwork: vi.fn().mockResolvedValue('testnet')
        }
    })
    describe('fetchBalance', () => {
        it('should fetch balance and compute Dash amounts correctly', async () => {
            const raw = 500000000000
            vi.mocked(getIdentityBalance).mockResolvedValue(raw as any)
            await actions.fetchBalance.call(mockStore)
            expect(mockStore.balance).toBe('500000000000')
            expect(mockStore.balanceBigInt).toBe(BigInt(500000000000))
            expect(mockStore.dashBigInt).toBe(5n)
            expect(mockStore.saveIdentityDataToStore).toHaveBeenCalled()
        })
        it('should return failure object and clear balance on error', async () => {
            vi.mocked(getIdentityBalance).mockRejectedValue(new Error('No Node'))
            const result = await actions.fetchBalance.call(mockStore)
            expect(result.success).toBe(false)
            expect(result.error).toBe('No Node')
            expect(mockStore.balance).toBeNull()
        })
    })
    describe('updateBalance', () => {
        it('should manually update balance and trigger persist', async () => {
            await actions.updateBalance.call(mockStore, '100000000000')
            expect(mockStore.dashBigInt).toBe(1n)
            expect(mockStore.saveIdentityDataToStore).toHaveBeenCalled()
        })
        it('should fail if balance string is empty', async () => {
            const result = await actions.updateBalance.call(mockStore, '')
            expect(result.success).toBe(false)
            expect(result.code).toBe('UPDATE_BALANCE_FAILED')
        })
    })
})
