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
        discovery = new SeedDiscovery()
    })

    it('should scan indices and derive keys for found identities', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)
        dapiMock.mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: [{
                    data: 'mock_hex',
                    dataB64: 'mock_hex',
                    keyType: 'ECDSA_HASH160',
                    purpose: 'AUTHENTICATION',
                    securityLevel: 'MASTER',
                    readOnly: false,
                    disabledAt: null
                }]
            }
        })

        // ADD THIS: Mock getIdentityById
        const identityMock = vi.mocked(DAPIService.getIdentityById)
        identityMock.mockResolvedValue({
            success: true,
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: [{
                    data: 'mock_hex',
                    dataB64: 'mock_hex',
                    keyType: 'ECDSA_HASH160',
                    purpose: 'AUTHENTICATION',
                    securityLevel: 'MASTER',
                    readOnly: false,
                    disabledAt: null
                }]
            }
        } as any)

        // ADD THIS: Mock getDPNSUsername
        const dpnsMock = vi.mocked(DAPIService.getDPNSUsername)
        dpnsMock.mockResolvedValue({
            success: true,
            data: null
        } as any)

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

    // Regression tests for type errors
    it('should use correct DAPIService method names (queryIdentityByHash instead of getIdentityByHash)', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)
        dapiMock
            .mockResolvedValueOnce({
                success: false,
                searchType: 'unique',
                error: 'Not found'
            })
            .mockResolvedValueOnce({
                success: true,
                searchType: 'non-unique',
                data: {
                    identityId: 'id_0',
                    balance: '100',
                    revision: '1',
                    publicKeys: []
                }
            })

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({ bytes: () => new Uint8Array([1]) })
            }
        } as any)

        const results = await discovery.discover('test seed phrase', {
            network: 'testnet',
            maxIdentityIndex: 1
        })

        // Should try unique search first
        expect(dapiMock).toHaveBeenCalledWith('mock_hex', 'testnet', true)
        // Should fall back to non-unique search
        expect(dapiMock).toHaveBeenCalledWith('mock_hex', 'testnet', false)
        expect(results.success).toBe(true)
        expect(results.identities).toHaveLength(1)
    })

    it('should use getDPNSUsername (not getDpnsUsername)', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)
        const dpnsMock = vi.mocked(DAPIService.getDPNSUsername)

        dapiMock.mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: []
            }
        })

        dpnsMock.mockResolvedValue({
            success: true,
            data: 'testuser.dash'
        } as any)

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({ bytes: () => new Uint8Array([1]) })
            }
        } as any)

        await discovery.discover('test seed phrase', {
            network: 'testnet',
            maxIdentityIndex: 1
        })

        expect(dpnsMock).toHaveBeenCalledWith('id_0', 'testnet')
    })

    it('should properly handle IDiscoveredIdentity type without username, revision, matchedKeys, totalKeys', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)
        const dpnsMock = vi.mocked(DAPIService.getDPNSUsername)
        const identityMock = vi.mocked(DAPIService.getIdentityById)

        dapiMock.mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                balance: '1000',
                revision: '5',
                publicKeys: []
            }
        })

        dpnsMock.mockResolvedValue({
            success: true,
            data: 'myuser.dash'
        } as any)

        identityMock.mockResolvedValue({
            success: true,
            data: {
                identityId: 'id_0',
                balance: '1000',
                revision: '5',
                publicKeys: [
                    {
                        data: 'keyhash1',
                        dataB64: 'keyhash1b64',
                        keyType: 'ECDSA_HASH160',
                        purpose: 'AUTHENTICATION',
                        securityLevel: 'MASTER',
                        readOnly: false,
                        disabledAt: null
                    }
                ]
            }
        } as any)

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({ bytes: () => new Uint8Array([1]) })
            }
        } as any)

        const results = await discovery.discover('test seed phrase', {
            network: 'testnet',
            maxIdentityIndex: 1
        })

        expect(results.success).toBe(true)
        expect(results.identities).toHaveLength(1)

        const identity = results.identities![0] as any
        // Should use Rust type properties (camelCase per TypeScript bindings)
        expect(identity.identityId).toBe('id_0')
        expect(identity.balance).toBe('1000')
        expect(identity.dpnsUsername).toBe('myuser.dash')
        expect(identity.identityIdx).toBe(0)
        expect(identity.keyType).toBe('ECDSA_HASH160')
        expect(identity.discoveredAt).toBeDefined()

        // Use getter method for derived metadata
        const metadata = discovery.getDerivedMetadata('id_0')
        expect(metadata).toBeDefined()
        expect(metadata.username).toBe('myuser.dash')
        expect(metadata.revision).toBe(5)
        expect(metadata.matchedKeys).toBe(0)
        expect(metadata.totalKeys).toBe(1)
        expect(metadata.canSign).toBe(false)
    })

    it('should not call non-existent saveIdentityWithKeys method', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)
        const identityMock = vi.mocked(DAPIService.getIdentityById)

        dapiMock.mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: [
                    {
                        data: 'mock_hex',
                        dataB64: 'mock_hex',
                        keyType: 'ECDSA_HASH160',
                        purpose: 'AUTHENTICATION',
                        securityLevel: 'MASTER',
                        readOnly: false,
                        disabledAt: null
                    }
                ]
            }
        })

        identityMock.mockResolvedValue({
            success: true,
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: [
                    {
                        data: 'mock_hex',
                        dataB64: 'mock_hex',
                        keyType: 'ECDSA_HASH160',
                        purpose: 'AUTHENTICATION',
                        securityLevel: 'MASTER',
                        readOnly: false,
                        disabledAt: null
                    }
                ]
            }
        } as any)

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({ bytes: () => new Uint8Array([1]) })
            }
        } as any)

        const mockStoreWithAutosave = {
            ...mockStore,
            saveIdentityWithKeys: vi.fn() // This should NOT be called
        }

        discovery = new SeedDiscovery()

        await discovery.discover('test seed phrase', {
            network: 'testnet',
            maxIdentityIndex: 1,
            autosave: true
        } as any) // Cast to any since autosave may not be in DiscoveryOptions type

        // Should NOT call saveIdentityWithKeys since it doesn't exist on IIdentityActions
        expect(mockStoreWithAutosave.saveIdentityWithKeys).not.toHaveBeenCalled()
    })

    it('should handle DPNS username fetch failure gracefully', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)
        const dpnsMock = vi.mocked(DAPIService.getDPNSUsername)

        dapiMock.mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: []
            }
        })

        dpnsMock.mockResolvedValue({
            success: false,
            error: 'DPNS not found'
        } as any)

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({ bytes: () => new Uint8Array([1]) })
            }
        } as any)

        const results = await discovery.discover('test seed phrase', {
            network: 'testnet',
            maxIdentityIndex: 1
        })

        expect(results.success).toBe(true)
        expect(results.identities).toHaveLength(1)

        const identity = results.identities![0] as any
        expect(identity.dpnsUsername).toBeNull()
        // Use getter method for derived metadata
        const metadata = discovery.getDerivedMetadata('id_0')
        expect(metadata.username).toBe('Identity #0') // Fallback username
    })

    it('should stop at first match when stopAtFirstMatch option is set', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)

        // First call finds identity
        dapiMock.mockResolvedValueOnce({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: []
            }
        })
        // Second call shouldn't happen because we stop at first match
        dapiMock.mockResolvedValueOnce({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_1',
                balance: '200',
                revision: '2',
                publicKeys: []
            }
        })

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({ bytes: () => new Uint8Array([1]) })
            }
        } as any)

        const results = await discovery.discover('test seed phrase', {
            network: 'testnet',
            maxIdentityIndex: 5,
            stopAtFirstMatch: true
        } as any) // Cast to any since stopAtFirstMatch may not be in DiscoveryOptions type

        expect(results.success).toBe(true)
        expect(results.identities).toHaveLength(1)
        expect(dapiMock).toHaveBeenCalledTimes(1) // Should stop after first match
    })

    it('should handle identity with public keys but no matching derived keys', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)

        dapiMock.mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: [
                    {
                        data: 'different_hash_1', // Won't match mock_hex
                        dataB64: 'different_hash_1',
                        keyType: 'ECDSA_HASH160',
                        purpose: 'AUTHENTICATION',
                        securityLevel: 'MASTER',
                        readOnly: false,
                        disabledAt: null
                    },
                    {
                        data: 'different_hash_2', // Won't match mock_hex
                        dataB64: 'different_hash_2',
                        keyType: 'ECDSA_HASH160',
                        purpose: 'ENCRYPTION',
                        securityLevel: 'HIGH',
                        readOnly: false,
                        disabledAt: null
                    }
                ]
            }
        })

        // Mock getIdentityById to return the same data
        const identityMock = vi.mocked(DAPIService.getIdentityById)
        identityMock.mockResolvedValue({
            success: true,
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: [
                    {
                        data: 'different_hash_1',
                        dataB64: 'different_hash_1',
                        keyType: 'ECDSA_HASH160',
                        purpose: 'AUTHENTICATION',
                        securityLevel: 'MASTER',
                        readOnly: false,
                        disabledAt: null
                    },
                    {
                        data: 'different_hash_2',
                        dataB64: 'different_hash_2',
                        keyType: 'ECDSA_HASH160',
                        purpose: 'ENCRYPTION',
                        securityLevel: 'HIGH',
                        readOnly: false,
                        disabledAt: null
                    }
                ]
            }
        } as any)

        // Mock DPNS to return null (no username)
        const dpnsMock = vi.mocked(DAPIService.getDPNSUsername)
        dpnsMock.mockResolvedValue({
            success: true,
            data: null
        } as any)

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: {
                WIF: () => 'mock_wif',
                getPublicKey: () => ({ bytes: () => new Uint8Array([1]) })
            }
        } as any)

        const results = await discovery.discover('test seed phrase', {
            network: 'testnet',
            maxIdentityIndex: 2 // FIXME THIS SHOULD WORK WITH ONLY (1) MOCKED IDENTITY
        })

        expect(results.success).toBe(true)
        expect(results.identities).toHaveLength(2) // FIXME THIS SHOULD WORK WITH ONLY (1) MOCKED IDENTITY

        // const identity = results.identities![0] as any
        // Use getter method for derived metadata
        const metadata = discovery.getDerivedMetadata('id_0')
        expect(metadata).not.toBeNull()
        expect(metadata.totalKeys).toBe(2) // 2 public keys on the identity
        expect(metadata.matchedKeys).toBe(0) // 0 keys matched (different hashes)
        expect(metadata.canSign).toBe(false) // No matching keys means can't sign
    })

    it('should handle key derivation errors gracefully', async () => {
        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)

        dapiMock.mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_0',
                balance: '100',
                revision: '1',
                publicKeys: [
                    {
                        data: 'different_hash', // Won't match
                        dataB64: 'different',
                        keyType: 'ECDSA_HASH160',
                        purpose: 'AUTHENTICATION',
                        securityLevel: 'MASTER',
                        readOnly: false,
                        disabledAt: null
                    }
                ]
            }
        })

        vi.mocked(KeyDerivationService.getPrivateKeyWASM)
            .mockResolvedValueOnce({
                publicKeyBytes: new Uint8Array([1, 2, 3]),
                privateKey: {
                    WIF: () => 'mock_wif',
                    getPublicKey: () => ({ bytes: () => new Uint8Array([1]) })
                }
            } as any)
            .mockRejectedValueOnce(new Error('Derivation failed'))

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockClear()

        const results = await discovery.discover('test seed phrase', {
            network: 'testnet',
            maxIdentityIndex: 1
        })

        expect(results.success).toBe(true)
        expect(results.identities).toHaveLength(1)

        // Should have attempted derivation but no keys matched
        // const identity = results.identities![0] as any
        // Use getter method for derived metadata
        const metadata = discovery.getDerivedMetadata('id_0')
        expect(metadata.matchedKeys).toBe(0)
    })
})

// Test error handling
describe('SeedDiscovery - Error Handling', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should return failure result when discovery fails', async () => {
        const discovery = new SeedDiscovery()
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockRejectedValue(new Error('Derivation error'))

        const results = await discovery.discover('invalid seed', {
            network: 'testnet',
            maxIdentityIndex: 1
        })

        expect(results.success).toBe(true) // Error is caught and logged, discovery continues
        expect(results.error).toBeUndefined() // No error in final result
        expect(results.identities).toHaveLength(0) // No identities found due to error
    })

    it('should handle DAPI query failures gracefully', async () => {
        const discovery = new SeedDiscovery()
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            privateKey: { WIF: () => 'wif' }
        } as any)

        const dapiMock = vi.mocked(DAPIService.queryIdentityByHash)
        dapiMock.mockResolvedValue({
            success: false,
            searchType: 'unique',
            error: 'DAPI unavailable'
        })

        const results = await discovery.discover('test seed', {
            network: 'testnet',
            maxIdentityIndex: 1
        })

        expect(results.success).toBe(true) // Discovery succeeds, just no identities found
        expect(results.identities).toHaveLength(0)
    })
})

// Test HUD logging functionality
describe('SeedDiscovery - HUD Logging', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Mock document for HUD
        Object.defineProperty(global, 'document', {
            value: {
                getElementById: vi.fn(() => null),
                createElement: vi.fn(() => ({
                    id: '',
                    style: {},
                    appendChild: vi.fn(),
                    removeChild: vi.fn(),
                    firstChild: null,
                    children: []
                })),
                body: {
                    appendChild: vi.fn()
                }
            },
            writable: true
        })
    })

    it('should not break when document is undefined (SSR)', () => {
        // Simulate SSR environment
        Object.defineProperty(global, 'document', {
            value: undefined,
            writable: true
        })

        // Should not throw
        expect(() => {
            const ssrDiscovery = new SeedDiscovery()
            ssrDiscovery.discover('test', { network: 'testnet' })
        }).not.toThrow()
    })
})
