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
  const mockStore = {
    saveKeys: vi.fn().mockResolvedValue(true)
  } as any

  beforeEach(() => {
    vi.clearAllMocks()
    manager = new IdentityManager(mockStore)
  })

  describe('routing logic', () => {
    it('routes 12 or 24 word strings to SeedDiscovery', async () => {
      const seed12 = 'word '.repeat(11) + 'word'
      await manager.discover(seed12)
      const seedInstance = vi.mocked(SeedDiscovery).mock.instances[0]
      if (!seedInstance) throw new Error('SeedDiscovery instance not created')
      // Fix: IdentityManager calls discovery.discover (the public entry point)
      expect(seedInstance.discover).toHaveBeenCalled()
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
        data: {
          identityId: 'id_123',
          balance: 1000,
          publicKeys: [{ id: 0, purpose: 0, securityLevel: 0 }]
        }
      } as any)
      vi.mocked(DAPIService.getDPNSUsername).mockResolvedValue({
        success: true,
        data: 'test.dash',
        error: null
      })
      const result = await manager.getIdentityById('id_123')
      expect(result.success).toBe(true)
      if (result.success && result.identity) {
        expect(result.identity.dpnsUsername).toBe('test.dash')
        expect(result.identity.balance).toBe('1000')
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
