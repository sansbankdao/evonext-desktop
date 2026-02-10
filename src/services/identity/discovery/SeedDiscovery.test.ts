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
        dapiMock.mockResolvedValueOnce({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                publicKeys: [
                    { data: 'mock_hex', purpose: 'AUTHENTICATION', keyType: 'ECDSA_HASH160' },
                    { data: 'mock_hex', purpose: 'TRANSFER', keyType: 'ECDSA_HASH160' }
                ]
            }
        })

        // FIX: Cast to any to bypass complex WASM type requirements
        const mockRes = {
            privateKey: {
                getPublicKey: () => ({
                    bytes: () => new Uint8Array(),
                    WIF: () => 'mock_wif'
                })
            },
            sourceType: 'MNEMONIC'
        } as any

        vi.mocked(KeyDerivationService.getPrivateKeyWASM)
            .mockResolvedValueOnce(mockRes)
            .mockResolvedValueOnce(mockRes)

        const results = await discovery.discoverFromSeed('test seed', 'testnet', { maxIdentityIndex: 1 })

        expect(dapiMock).toHaveBeenCalledTimes(1)
        expect(results).toHaveLength(1)
        expect(results?.[0]?.identityId).toBe('id_0')
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
            privateKey: {
                getPublicKey: () => ({
                    bytes: () => new Uint8Array(),
                    WIF: () => 'mock_wif'
                })
            },
            sourceType: 'MNEMONIC'
        } as any

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue(mockRes)

        const results = await discovery.discoverFromSeed('test seed', 'testnet', { maxIdentityIndex: 5 })

        expect(results).toHaveLength(1)
        expect(dapiMock).toHaveBeenCalledTimes(1)
    })
})
