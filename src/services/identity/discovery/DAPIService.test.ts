// src/services/identity/discovery/DAPIService.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DAPIService } from './DAPIService'
import { invoke } from '@/utils/tauri'

vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))

describe('DAPIService - Response Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getIdentityById', () => {
        it('should correctly handle a successful response', async () => {
            vi.mocked(invoke).mockResolvedValue({
                identityId: 'id_123',
                balance: '500'
            })

            const result = await DAPIService.getIdentityById('id_123', 'testnet')

            expect(result.success).toBe(true)
            expect(result.data.identityId).toBe('id_123')
        })

        it('should handle array returns (Rust behavior normalization)', async () => {
            vi.mocked(invoke).mockResolvedValue([{ identityId: 'id_from_array' }])

            const result = await DAPIService.getIdentityById('id_123', 'testnet')

            expect(result.success).toBe(true)
            expect(result.data.identityId).toBe('id_from_array')
        })

        it('should handle errors by catching the thrown invoke', async () => {
            vi.mocked(invoke).mockRejectedValue(new Error('Identity not found'))

            const result = await DAPIService.getIdentityById('missing', 'testnet')

            expect(result.success).toBe(false)
            expect(result.error).toBe('Identity not found')
        })
    })

    describe('queryIdentityByHash', () => {
        it('should handle unique public key hash searches', async () => {
            vi.mocked(invoke).mockResolvedValue({ identityId: 'unique_id' })

            const result = await DAPIService.queryIdentityByHash('hash123', 'testnet', true)

            expect(result.success).toBe(true)
            expect(result.searchType).toBe('unique')
            expect(invoke).toHaveBeenCalledWith('get_identity_by_public_key_hash', expect.anything())
        })

        it('should handle non-unique public key hash searches', async () => {
            vi.mocked(invoke).mockResolvedValue([{ identityId: 'non_unique_id' }])

            const result = await DAPIService.queryIdentityByHash('hash456', 'testnet', false)

            expect(result.success).toBe(true)
            expect(result.searchType).toBe('non-unique')
            expect(invoke).toHaveBeenCalledWith('get_identity_by_non_unique_public_key_hash', expect.anything())
        })

        it('should return error when no identity is found (empty return)', async () => {
            vi.mocked(invoke).mockResolvedValue(null)

            const result = await DAPIService.queryIdentityByHash('missing', 'testnet', true)

            expect(result.success).toBe(false)
            expect(result.error).toBe('No identity found')
        })
    })

    describe('getDPNSUsername', () => {
        it('should handle raw string responses from Rust', async () => {
            vi.mocked(invoke).mockResolvedValue('shomari.dash')

            const name = await DAPIService.getDPNSUsername('id_1', 'testnet')
            expect(name).toBe('shomari.dash')
        })

        it('should handle complex object responses with result key', async () => {
            vi.mocked(invoke).mockResolvedValue({
                result: { username: 'shomari.dash' }
            })

            const name = await DAPIService.getDPNSUsername('id_1', 'testnet')
            expect(name).toBe('shomari.dash')
        })

        it('should handle array results inside result object', async () => {
            vi.mocked(invoke).mockResolvedValue({
                result: [{ username: 'shomari.dash' }]
            })

            const name = await DAPIService.getDPNSUsername('id_1', 'testnet')
            expect(name).toBe('shomari.dash')
        })

        it('should return null on exception', async () => {
            vi.mocked(invoke).mockRejectedValue(new Error('Network Fail'))
            const name = await DAPIService.getDPNSUsername('id_1', 'testnet')
            expect(name).toBeNull()
        })
    })

    describe('getDPNSUsernames', () => {
        it('should return full list of usernames', async () => {
            vi.mocked(invoke).mockResolvedValue(['alice.dash', 'bob.dash'])

            const names = await DAPIService.getDPNSUsernames('id_1', 'testnet')

            expect(names).toHaveLength(2)
            expect(names).toContain('alice.dash')
            expect(names).toContain('bob.dash')
        })

        it('should handle wrapped result list', async () => {
            vi.mocked(invoke).mockResolvedValue({ result: ['wrapped.dash'] })

            const names = await DAPIService.getDPNSUsernames('id_1', 'testnet')
            expect(names).toEqual(['wrapped.dash'])
        })
    })
})
