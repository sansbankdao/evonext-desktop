// src/services/posts/fetching.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fetching from './fetching'
import { invoke } from '@/utils/tauri'
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({
        network: { value: 'testnet' }
    })
}))
describe('Posts Fetching Service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
    it('fetchPostsFromTauri should request correct contract and filter', async () => {
        vi.mocked(invoke).mockResolvedValue([{ content: 'test', $ownerId: 'u1' }])
        const results = await fetching.fetchPostsFromTauri('testnet', {
            contractId: 'contract_abc',
            limit: 10
        })
        expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
            dataContractId: 'contract_abc',
            limit: 10,
            network: 'testnet'
        }))
        expect(results[0]!.ownerId).toBe('u1')
    })
    it('fetchDocumentsById should return empty array for empty input', async () => {
        const result = await fetching.fetchDocumentsById('testnet', 'id', [])
        expect(result).toEqual([])
        expect(invoke).not.toHaveBeenCalled()
    })
    it('fetchUserProfile should request dashpay contract', async () => {
        vi.mocked(invoke).mockResolvedValue([{ $type: 'profile', $ownerId: 'u1' }])
        const profile = await fetching.fetchUserProfile('u1', 'testnet')
        expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
            documentType: 'profile'
        }))
        expect(profile?.ownerId).toBe('u1')
    })
    it('fetchDPNSName should return label from record', async () => {
        vi.mocked(invoke).mockResolvedValue([{ label: 'shomari.dash' }])
        const name = await fetching.fetchDPNSName('u1', 'testnet')
        expect(name).toBe('shomari.dash')
    })
})
