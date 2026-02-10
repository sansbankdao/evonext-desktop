// src/services/identity/discovery/SeedDiscovery.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SeedDiscovery } from './SeedDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'

vi.mock('../keyDerivation.service', () => ({
    KeyDerivationService: {
        getPrivateKeyWASM: vi.fn(),
        cleanup: vi.fn()
    }
}))
vi.mock('./DAPIService', () => ({
    DAPIService: {
        queryIdentityByHash: vi.fn(),
        getDPNSUsername: vi.fn(),
        getIdentityById: vi.fn()
    }
}))
vi.mock('@evonext/utils', () => ({
    binToHex: vi.fn(() => 'mock_hex')
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
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            privateKey: {
                getPublicKey: () => ({ bytes: () => new Uint8Array() }),
                WIF: () => 'mock_wif'
            }
        } as any)
    })
    it('should scan indices and derive keys for found identities', async () => {
        // Setup: Identity found at Index 0 with 2 keys in DAPI
        // Added searchType to satisfy DAPIHashSearchResult interface
        vi.mocked(DAPIService.queryIdentityByHash).mockResolvedValueOnce({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                publicKeys: [
                    { data: 'mock_hex', purpose: 'AUTHENTICATION' },
                    { data: 'mock_hex', purpose: 'TRANSFER' }
                ]
            }
        })
        const results = await discovery.discoverFromSeed('test seed', 'testnet', {
            maxIdentityIndex: 1
        })
        expect(results).toHaveLength(1)
        expect(results[0]?.identityId).toBe('id_0')
        // Calls: 1 for Search Anchor (Index 0, Key 0), 2 for the keys found in DAPI manifest
        expect(KeyDerivationService.getPrivateKeyWASM).toHaveBeenCalledTimes(3)
        // Verify key IDs match the array index (0 and 1)
        expect(mockStore.saveKeys).toHaveBeenCalledWith('testnet', 'id_0', expect.arrayContaining([
            expect.objectContaining({ keyId: 0, identityId: 'id_0' }),
            expect.objectContaining({ keyId: 1, identityId: 'id_0' })
        ]))
    })
    it('should respect the cancellation signal and stop the loop', async () => {
        vi.mocked(DAPIService.queryIdentityByHash).mockImplementation(async () => {
            discovery.cancel()
            return {
                success: true,
                searchType: 'unique',
                data: { identityId: 'id_0', publicKeys: [] }
            }
        })
        const results = await discovery.discoverFromSeed('test seed', 'testnet', {
            maxIdentityIndex: 5
        })
        expect(results).toHaveLength(1)
        // Ensure loop exited before index 1
        expect(DAPIService.queryIdentityByHash).toHaveBeenCalledTimes(1)
    })
    it('should handle DAPI failures gracefully', async () => {
        vi.mocked(DAPIService.queryIdentityByHash).mockResolvedValue({
            success: false,
            searchType: 'unique',
            error: 'DAPI Connectivity Issue'
        })
        const results = await discovery.discoverFromSeed('test seed', 'testnet', {
            maxIdentityIndex: 2
        })
        expect(results).toHaveLength(0)
    })
})
