// src/stores/wallet/actions/api.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    fetchIdentityTransactions,
    fetchIdentityTransfers,
    fetchTokenTransitions,
    fetchTokenBalance
} from './api'
describe('Wallet API Service', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn())
    })
    it('fetchIdentityTransactions should handle resultSet and raw arrays', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ resultSet: [{ txid: '1' }] })
        } as any)
        let res = await fetchIdentityTransactions('id')
        expect(res).toHaveLength(1)
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => [{ txid: '2' }]
        } as any)
        res = await fetchIdentityTransactions('id')
        expect(res).toHaveLength(1)
    })
    it('fetchIdentityTransactions should throw on error status', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 404 } as any)
        await expect(fetchIdentityTransactions('id')).rejects.toThrow('Explorer API error')
    })
    it('fetchIdentityTransfers should return empty array', async () => {
        const res = await fetchIdentityTransfers('id')
        expect(res).toEqual([])
    })
    it('fetchTokenTransitions should fetch and return data', async () => {
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ resultSet: [{ id: 't1' }] })
        } as any)
        const res = await fetchTokenTransitions('contract')
        expect(res).toHaveLength(1)
    })
    it('fetchTokenBalance should handle balance strings and convert to BigInt', async () => {
        // Test object response
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ balance: '1000' })
        } as any)
        let res = await fetchTokenBalance('id', 'contract')
        expect(res).toBe(1000n)
        // Test raw value response
        vi.mocked(fetch).mockResolvedValueOnce({
            ok: true,
            json: async () => '2000'
        } as any)
        res = await fetchTokenBalance('id', 'contract')
        expect(res).toBe(2000n)
    })
})
