// src/services/identity/discovery/IdentityManager.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IdentityManager } from './IdentityManager'
import { SeedDiscovery } from './SeedDiscovery'
import { KeyDiscovery } from './KeyDiscovery'

// Mock the classes themselves
vi.mock('./SeedDiscovery')
vi.mock('./KeyDiscovery')

describe('IdentityManager - Routing', () => {
    let manager: IdentityManager

    const mockStore = {} as any

    beforeEach(() => {
        vi.clearAllMocks()
        manager = new IdentityManager(mockStore)
    })

    it('should route 12-word strings to SeedDiscovery', async () => {
        const seed = 'one two three four five six seven eight nine ten eleven twelve'
        await manager.discover(seed)
        // Check if the SeedDiscovery instance was used
        const seedInstance = vi.mocked(SeedDiscovery).mock.instances[0]
        expect(seedInstance.discoverFromSeed).toHaveBeenCalled()
        const keyInstance = vi.mocked(KeyDiscovery).mock.instances[0]
        expect(keyInstance.discover).not.toHaveBeenCalled()
    })

    it('should route 24-word strings to SeedDiscovery', async () => {
        const seed = 'word '.repeat(24).trim()
        await manager.discover(seed)
        const seedInstance = vi.mocked(SeedDiscovery).mock.instances[0]
        expect(seedInstance.discoverFromSeed).toHaveBeenCalled()
    })

    it('should route single keys (non 12/24 words) to KeyDiscovery', async () => {
        const wif = 'cT6H9...'
        await manager.discover(wif)
        const keyInstance = vi.mocked(KeyDiscovery).mock.instances[0]
        expect(keyInstance.discover).toHaveBeenCalled()
    })
})
