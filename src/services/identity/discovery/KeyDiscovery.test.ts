// src/services/identity/discovery/KeyDiscovery.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { KeyDiscovery } from './KeyDiscovery'
import { DAPIService } from './DAPIService'
import { PrivateKeyWASM } from 'pshenmic-dpp'
vi.mock('pshenmic-dpp', () => ({
    PrivateKeyWASM: {
        fromWIF: vi.fn(),
        fromHex: vi.fn()
    }
}))
vi.mock('./DAPIService', () => ({
    DAPIService: {
        queryIdentityByHash: vi.fn(),
        getDPNSUsername: vi.fn()
    }
}))
vi.mock('@evonext/utils', () => ({
    binToHex: vi.fn(() => 'mock_hex_hash'),
    hexToBin: vi.fn(() => new Uint8Array(33))
}))
vi.mock('@/services/crypto', () => ({
    hash160: vi.fn().mockResolvedValue(new Uint8Array(20))
}))
describe('KeyDiscovery - Single Key Logic', () => {
    let discovery: KeyDiscovery
    const mockStore = {
        saveKeys: vi.fn().mockResolvedValue({ success: true })
    }
    beforeEach(() => {
        vi.clearAllMocks()
        discovery = new KeyDiscovery(mockStore as any)
        const mockPkInstance = {
            getPublicKey: () => ({ bytes: () => new Uint8Array(33) }),
            WIF: () => 'mock_wif'
        }
        vi.mocked(PrivateKeyWASM.fromWIF).mockReturnValue(mockPkInstance as any)
    })
    it('should discover identity from a WIF and save the private key', async () => {
        const mockWif = 'c' + 'A'.repeat(50)
        vi.mocked(DAPIService.queryIdentityByHash).mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: {
                identityId: 'id_wif',
                publicKeys: [{ id: 0, data: 'mock_hex_hash' }] as any[]
            }
        })
        const result = await discovery.discover(mockWif, { network: 'testnet' })
        expect(result.success).toBe(true)
        expect(result.identity?.identityId).toBe('id_wif')
        expect(mockStore.saveKeys).toHaveBeenCalled()
    })
    it('should discover identity from a Public Key but NOT save a private key', async () => {
        const mockPubKey = '02' + 'f'.repeat(64)
        vi.mocked(DAPIService.queryIdentityByHash).mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: { identityId: 'id_pub', publicKeys: [] as any[] }
        })
        const result = await discovery.discover(mockPubKey, { network: 'testnet' })
        expect(result.success).toBe(true)
        expect(mockStore.saveKeys).not.toHaveBeenCalled()
    })
})
