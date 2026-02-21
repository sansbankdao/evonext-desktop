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
    it('fetchPostsFromTauri should handle ownerId filter', async () => {
        vi.mocked(invoke).mockResolvedValue([{ content: 'filtered', $ownerId: 'u2' }])
        const results = await fetching.fetchPostsFromTauri('testnet', {
            contractId: 'contract_abc',
            ownerId: 'owner_123',
            orderBy: 'asc',
            limit: 5
        })
        expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
            dataContractId: 'contract_abc',
            limit: 5,
            network: 'testnet'
        }))
        expect(results).toHaveLength(1)
    })
    it('fetchPostsFromTauri should handle null response', async () => {
        vi.mocked(invoke).mockResolvedValue(null)
        const results = await fetching.fetchPostsFromTauri('testnet', {
            contractId: 'contract_abc'
        })
        expect(results).toEqual([])
    })
    it('fetchDocumentsById should return empty array for empty input', async () => {
        const result = await fetching.fetchDocumentsById('testnet', 'id', [])
        expect(result).toEqual([])
        expect(invoke).not.toHaveBeenCalled()
    })
    it('fetchDocumentsById should fetch documents by ids', async () => {
        vi.mocked(invoke).mockResolvedValue([
            { $id: 'doc1', content: 'a', $ownerId: 'u1' },
            { $id: 'doc2', content: 'b', $ownerId: 'u2' }
        ])
        const results = await fetching.fetchDocumentsById('testnet', 'contract_x', ['doc1', 'doc2'])
        expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
            dataContractId: 'contract_x',
            documentType: 'post',
            limit: 2,
            network: 'testnet'
        }))
        expect(results).toHaveLength(2)
    })
    it('fetchUserProfile should request dashpay contract', async () => {
        vi.mocked(invoke).mockResolvedValue([{ $type: 'profile', $ownerId: 'u1' }])
        const profile = await fetching.fetchUserProfile('u1', 'testnet')
        expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
            documentType: 'profile'
        }))
        expect(profile?.ownerId).toBe('u1')
    })
    it('fetchUserProfile should return null for empty results', async () => {
        vi.mocked(invoke).mockResolvedValue([])
        const profile = await fetching.fetchUserProfile('u1', 'testnet')
        expect(profile).toBeNull()
    })
    it('fetchDPNSName should return label from record', async () => {
        vi.mocked(invoke).mockResolvedValue([{ label: 'shomari.dash' }])
        const name = await fetching.fetchDPNSName('u1', 'testnet')
        expect(name).toBe('shomari.dash')
    })
    it('fetchDPNSName should return normalizedLabel as fallback', async () => {
        vi.mocked(invoke).mockResolvedValue([{ normalizedLabel: 'shomari' }])
        const name = await fetching.fetchDPNSName('u1', 'testnet')
        expect(name).toBe('shomari')
    })
    it('fetchDPNSName should return null for empty results', async () => {
        vi.mocked(invoke).mockResolvedValue([])
        const name = await fetching.fetchDPNSName('u1', 'testnet')
        expect(name).toBeNull()
    })
    it('fetchPostsFromDAPI should use DAPI wrapper with defaults', async () => {
        vi.mocked(invoke).mockResolvedValue([{ content: 'dapi post', $ownerId: 'u1' }])
        const result = await fetching.fetchPostsFromDAPI()
        expect(result.posts).toHaveLength(1)
        expect(result.hasNextPage).toBe(false)
        expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
            orderBy: expect.stringContaining('desc')
        }))
    })
    it('fetchPostsFromDAPI should handle ascending order', async () => {
        vi.mocked(invoke).mockResolvedValue([])
        const result = await fetching.fetchPostsFromDAPI({ orderBy: 'asc' })
        expect(result.posts).toEqual([])
        expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
            orderBy: expect.stringContaining('asc')
        }))
    })
    it('fetchPostsFromDAPI should pass ownerId and limit', async () => {
        vi.mocked(invoke).mockResolvedValue([])
        await fetching.fetchPostsFromDAPI({ ownerId: 'owner_1', limit: 5, orderBy: 'oldest' })
        expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
            limit: 5,
            orderBy: expect.stringContaining('asc')
        }))
    })
})
