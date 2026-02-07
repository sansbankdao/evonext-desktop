// src/services/identity/discovery/IdentityManager.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IdentityManager } from './IdentityManager'
import { SeedDiscovery } from './SeedDiscovery'
import { KeyDiscovery } from './KeyDiscovery'
import { DAPIService } from './DAPIService'
vi.mock('./SeedDiscovery')
vi.mock('./KeyDiscovery')
vi.mock('./DAPIService')
describe('IdentityManager', () => {
    let manager: IdentityManager
    const mockStore = {} as any
    beforeEach(() => {
        vi.clearAllMocks()
        manager = new IdentityManager(mockStore)
    })
    describe('routing logic', () => {
        it('routes 12 or 24 word strings to SeedDiscovery', async () => {
            const seed12 = 'word '.repeat(12).trim()
            await manager.discover(seed12)
            const seedInstance = vi.mocked(SeedDiscovery).mock.instances[0]
            if (!seedInstance) throw new Error('SeedDiscovery instance not created')
            expect(seedInstance.discoverFromSeed).toHaveBeenCalled()
        })
        it('routes hexadecimal or WIF strings to KeyDiscovery', async () => {
            const hexKey = 'a'.repeat(64)
            await manager.discover(hexKey)
            const keyInstance = vi.mocked(KeyDiscovery).mock.instances[0]
            if (!keyInstance) throw new Error('KeyDiscovery instance not created')
            expect(keyInstance.discover).toHaveBeenCalledWith(hexKey, expect.any(Object))
        })
    })
    describe('identity by ID lookups', () => {
        it('merges DAPI identity data with DPNS usernames', async () => {
            vi.mocked(DAPIService.getIdentityById).mockResolvedValue({
                success: true,
                searchType: 'unique',
                data: {
                    identityId: 'id_123',
                    balance: 1000,
                    revision: 1,
                    publicKeys: [{ purpose: 0, securityLevel: 0, keyType: 'ECDSA' }] as any[]
                }
            })
            vi.mocked(DAPIService.getDPNSUsername).mockResolvedValue('test.dash')
            const result = await manager.getIdentityById('id_123')
            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.identity?.dpnsUsername).toBe('test.dash')
                expect(result.identity?.balance).toBe('1000')
            }
        })
        it('extracts and formats associated keys for display', async () => {
            vi.mocked(DAPIService.getIdentityById).mockResolvedValue({
                success: true,
                searchType: 'unique',
                data: {
                    publicKeys: [
                        { purpose: 0, securityLevel: 0, keyType: 'ECDSA' },
                        { purpose: 3, securityLevel: 1, keyType: 'ECDSA' }
                    ] as any[]
                }
            })
            const result = await manager.getIdentityById('id_123')
            expect(result.associatedKeys).toBeDefined()
            if (result.associatedKeys) {
                expect(result.associatedKeys[0]!.purpose).toBe('Authentication')
                expect(result.associatedKeys[1]!.purpose).toBe('Transfer')
            }
        })
    })
    describe('helper methods', () => {
        it('cleans up resources', () => {
            manager.cleanup()
            const seedInstance = vi.mocked(SeedDiscovery).mock.instances[0]
            if (seedInstance) {
                expect(seedInstance.cancel).toHaveBeenCalled()
            }
        })
    })
})
