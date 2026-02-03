// src/services/identity/discovery/DAPIService.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DAPIService } from './DAPIService'
import { invoke } from '@/utils/tauri'

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
}))

describe('DAPIService - Response Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('getIdentityById', () => {
        it('should correctly peel a nested successful response', async () => {
            // Simulate the Rust result: vec![{ success: true, result: { id: '...' } }]
            vi.mocked(invoke).mockResolvedValue([{
                success: true,
                result: { identityId: 'id_123', balance: '500' }
            }])

            const result = await DAPIService.getIdentityById('id_123', 'testnet')

            expect(result.success).toBe(true)
            expect(result.data.identityId).toBe('id_123')
        })

        it('should handle the "Fallback Case" where data is at the root of the wrapper', async () => {
            // Simulate: vec![{ success: true, identityId: '...' }] (no .result key)
            vi.mocked(invoke).mockResolvedValue([{
                success: true,
                identityId: 'id_999'
            }])

            const result = await DAPIService.getIdentityById('id_999', 'testnet')

            expect(result.success).toBe(true)
            expect(result.data.identityId).toBe('id_999')
        })

        it('should return success: false when Rust returns an error wrapper', async () => {
            vi.mocked(invoke).mockResolvedValue([{
                success: false,
                error: 'Identity not found'
            }])

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
            vi.mocked(invoke).mockResolvedValue([{
                success: true,
                result: { username: 'shomari.dash' }
            }])

            const name = await DAPIService.getDPNSUsername('id_1', 'testnet')
            expect(name).toBe('shomari.dash')
        })
    })
})
