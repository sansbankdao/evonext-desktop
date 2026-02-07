// src/stores/identity/actions/discovered.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { discoveredIdentitiesActions } from './discovered'
import { invoke } from '@/utils/tauri'

vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))

vi.mock('@/utils/env', () => ({
    log: vi.fn()
}))

describe('discoveredIdentitiesActions', () => {
    const actions = discoveredIdentitiesActions()
    const mockState = {} as any

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('saveDiscoveredIdentities should filter invalid IDs and call invoke', async () => {
        vi.mocked(invoke).mockResolvedValue(1)
        const identities = [
            { identityId: 'id1', identityIdx: 0 },
            { identityId: '', identityIdx: 1 } // Invalid
        ] as any

        const result = await actions.saveDiscoveredIdentities.call(mockState, identities, 'testnet', 'seed')

        expect(result.success).toBe(true)
        expect(result.savedCount).toBe(1)
        expect(invoke).toHaveBeenCalledWith('save_discovered_identities', expect.objectContaining({
            network: 'testnet'
        }))
    })

    it('loadDiscoveredIdentities should return result from Rust', async () => {
        const mockData = { identities: { 'id1': {} } }
        vi.mocked(invoke).mockResolvedValue(mockData)

        const result = await actions.loadDiscoveredIdentities.call(mockState, 'testnet')
        expect(result).toEqual(mockData)
    })

    it('clearDiscoveredIdentities should handle backend failure', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('Locked'))
        const result = await actions.clearDiscoveredIdentities.call(mockState, 'testnet')
        expect(result.success).toBe(false)
        expect(result.error).toBe('Locked')
    })
})
