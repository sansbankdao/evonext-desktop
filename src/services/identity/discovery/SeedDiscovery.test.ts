// src/services/identity/discovery/SeedDiscovery.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SeedDiscovery } from './SeedDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'

// Mocking external modules
vi.mock('../keyDerivation.service', () => ({
    KeyDerivationService: {
        getPrivateKeyWASM: vi.fn()
    }
}))

vi.mock('./DAPIService', () => ({
    DAPIService: {
        queryIdentityByHash: vi.fn(),
        getDPNSUsername: vi.fn()
    }
}))

vi.mock('@evonext/utils', () => ({
    binToHex: vi.fn((bytes) => 'mock_hex')
}))

vi.mock('@/services/crypto', () => ({
    hash160: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
}))

describe('SeedDiscovery - Indexing Loop', () => {
    let discovery: SeedDiscovery
    const mockStore = {
        saveKeys: vi.fn().mockResolvedValue({ success: true })
    }

    beforeEach(() => {
        vi.clearAllMocks()
        discovery = new SeedDiscovery(mockStore as any)

        // Setup default KeyDerivation mock
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            privateKey: {
                getPublicKey: () => ({ bytes: () => new Uint8Array() }),
                WIF: () => 'mock_wif'
            }
        } as any)
    })

    it('should scan all indices up to the limit and find multiple identities', async () => {
        // Setup: Identity found at Index 0 and Index 2, but not Index 1
        vi.mocked(DAPIService.queryIdentityByHash)
            .mockResolvedValueOnce({ success: true, data: { identityId: 'id_0', publicKeys: [] } }) // Idx 0
            .mockResolvedValueOnce({ success: false }) // Idx 1 Unique
            .mockResolvedValueOnce({ success: false }) // Idx 1 Non-Unique
            .mockResolvedValueOnce({ success: true, data: { identityId: 'id_2', publicKeys: [] } }) // Idx 2

        const results = await discovery.discoverFromSeed('test seed', 'testnet', { maxIdentityIndex: 3 })

        expect(results).toHaveLength(2)
        expect(results[0].identityId).toBe('id_0')
        expect(results[1].identityId).toBe('id_2')
        expect(KeyDerivationService.getPrivateKeyWASM).toHaveBeenCalledTimes(3 + 0) // 3 index attempts
    })

    it('should trigger the Non-Unique fallback if the Unique query fails', async () => {
        // Setup: Unique fails, but Non-Unique succeeds
        vi.mocked(DAPIService.queryIdentityByHash)
            .mockResolvedValueOnce({ success: false }) // Unique attempt
            .mockResolvedValueOnce({ success: true, data: { identityId: 'id_fallback' } }) // Non-Unique attempt

        await discovery.discoverFromSeed('test seed', 'testnet', { maxIdentityIndex: 1 })

        // Verify it was called twice for the same index
        expect(DAPIService.queryIdentityByHash).toHaveBeenCalledTimes(2)
        expect(DAPIService.queryIdentityByHash).toHaveBeenNthCalledWith(1, expect.any(String), 'testnet', true)
        expect(DAPIService.queryIdentityByHash).toHaveBeenNthCalledWith(2, expect.any(String), 'testnet', false)
    })

    it('should respect the cancellation signal', async () => {
        // Stop discovery after index 0
        vi.mocked(DAPIService.queryIdentityByHash).mockImplementation(async () => {
            discovery.cancel()
            return { success: true, data: { identityId: 'id_0' } }
        })

        const results = await discovery.discoverFromSeed('test seed', 'testnet', { maxIdentityIndex: 5 })

        expect(results).toHaveLength(1)
        // It should have stopped before index 1
        expect(DAPIService.queryIdentityByHash).toHaveBeenCalledTimes(1)
    })
})
