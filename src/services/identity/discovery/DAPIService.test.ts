// src/services/identity/discovery/DAPIService.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DAPIService } from './DAPIService'
import { invoke } from '@/utils/tauri'

// Mock our local tauri utility instead of the core tauri library
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))

describe('DAPIService - Response Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getIdentityById', () => {
        it('should correctly handle a successful response', async () => {
            // Our invoke helper already unwraps, so we mock the FINAL data
            vi.mocked(invoke).mockResolvedValue({
                identityId: 'id_123',
                balance: '500'
            })

            const result = await DAPIService.getIdentityById('id_123', 'testnet')

            // DAPIService usually returns its own {success, data} wrapper
            expect(result.success).toBe(true)
            expect(result.data.identityId).toBe('id_123')
        })

        it('should handle errors by catching the thrown invoke', async () => {
            // Simulate the invoke helper throwing an error
            vi.mocked(invoke).mockRejectedValue(new Error('Identity not found'))

            const result = await DAPIService.getIdentityById('missing', 'testnet')

            expect(result.success).toBe(false)
            expect(result.error).toBe('Identity not found')
        })
    })

    describe('getDPNSUsername', () => {
        it('should handle raw string responses from Rust', async () => {
            vi.mocked(invoke).mockResolvedValue('shomari.dash')

            const name = await DAPIService.getDPNSUsername('id_1', 'testnet')
            expect(name).toBe('shomari.dash')
        })

        it('should handle complex object responses with username key', async () => {
            // DAPIService expects the wrapper structure if it hasn't been refactored yet
            // OR if you refactored the service, the mock must match.
            // Let's assume DAPIService expects the UNWRAPPED object now:
            vi.mocked(invoke).mockResolvedValue({
                result: { username: 'shomari.dash' }
            })

            const name = await DAPIService.getDPNSUsername('id_1', 'testnet')
            expect(name).toBe('shomari.dash')
        })
    })
})
