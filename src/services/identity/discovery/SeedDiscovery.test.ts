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
        saveKeys: vi.fn().mockResolvedValue(undefined)
    }
    beforeEach(() => {
        vi.clearAllMocks()
        discovery = new SeedDiscovery(mockStore as any)
    })
    it('should scan indices and derive keys for found identities', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)
        dapiMock.mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                publicKeys: [
                    { data: 'mock_hex', purpose: 0, keyType: 'ECDSA_HASH160' }
                ]
            }
        })
        const mockRes = {
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({
                    bytes: () => new Uint8Array([1, 2, 3])
                })
            }
        } as any
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue(mockRes)
        const results = await discovery.discoverFromSeed('test seed', 'testnet', {
            maxIdentityIndex: 1
        })
        expect(dapiMock).toHaveBeenCalled()
        expect(results).toHaveLength(1)
        expect(results[0]?.identityId).toBe('id_0')
        expect(mockStore.saveKeys).toHaveBeenCalled()
    })
    it('should respect the cancellation signal and stop the loop', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)
        dapiMock.mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: { identityId: 'id_0', publicKeys: [] }
        })
        const mockRes = {
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({
                    bytes: () => new Uint8Array([1, 2, 3])
                })
            }
        } as any
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue(mockRes)
        // Simulate cancellation after the first iteration
        // We trigger the abort signal while the promise-chain is active
        const discoveryPromise = discovery.discoverFromSeed('test', 'testnet', {
            maxIdentityIndex: 5
        })
        discovery.cancel()
        const results = await discoveryPromise
        // Since we cancelled immediately/early,
        // it should have stopped at index 0 or 1 depending on event loop timing
        expect(results.length).toBeLessThan(5)
    })
})
