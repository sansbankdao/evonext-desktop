// src/services/identity/discovery/SeedDiscovery.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SeedDiscovery } from './SeedDiscovery'
import { DAPIService } from './DAPIService'
import { KeyDerivationService } from '../keyDerivation.service'
vi.mock('../keyDerivation.service', () => ({
    KeyDerivationService: { getPrivateKeyWASM: vi.fn(), cleanup: vi.fn() }
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
                balance: '100',
                // FIXED: Changed revision from number (1) to string ('1')
                revision: '1',
                publicKeys: [{
                    data: 'mock_hex',
                    dataB64: 'mock_hex',
                    // FIXED: Changed keyType from number (0) to string ('ECDSA_HASH160')
                    keyType: 'ECDSA_HASH160',
                    purpose: 'AUTHENTICATION',
                    securityLevel: 'MASTER',
                    readOnly: false,
                    disabledAt: null
                }]
            }
        })
        const mockRes = {
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({ bytes: () => new Uint8Array([1]) })
            }
        } as any
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue(mockRes)
        const results = await discovery.discover('word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12', {
            network: 'testnet',
            maxIdentityIndex: 1
        })
        expect(dapiMock).toHaveBeenCalled()
        expect(results.identities).toHaveLength(1)
        expect(results.success).toBe(true)
    })
    it('should respect the cancellation signal and stop the loop', async () => {
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: { WIF: () => 'wif' }
        } as any)
        const promise = discovery.discover('word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12', {
            network: 'testnet',
            maxIdentityIndex: 10
        })
        discovery.cancel()
        const res = await promise
        expect(res.identities!.length).toBeLessThan(10)
    })
})
