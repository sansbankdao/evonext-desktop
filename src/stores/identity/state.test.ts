// src/stores/identity/state.test.ts

import { describe, it, expect } from 'vitest'
import { useIdentityState } from './state'

describe('Identity Store State', () => {
    it('should initialize with default values', () => {
        const state = useIdentityState()
        expect(state.isAuthenticated).toBe(false)
        expect(state.balance).toBe('0')
        expect(state.publicKeys).toEqual([])
        expect(state.identityId).toBeNull()
        expect(state.identities).toEqual({})
    })

    it('stubs should return expected failure objects', async () => {
        const state = useIdentityState()

        // Execute all stubs to cover lines 35-55 with all required arguments
        const seedRes = await state.connectWithSeed('', 'mainnet', '', 0)
        expect(seedRes.success).toBe(false)

        const keyRes = await state.connectWithSingleKey('', '', 'mainnet')
        expect(keyRes.success).toBe(false)

        const writeRes = await state.connectWriteOnlyFromDiscovered({} as any, 'mainnet')
        expect(writeRes.success).toBe(false)

        const switchRes = await state.switchIdentity('')
        expect(switchRes.success).toBe(false)

        const discRes = await state.saveDiscoveredIdentities([], 'mainnet', 'seed')
        expect(discRes.savedCount).toBe(0)

        // Fixed: Added network argument
        const loadDisc = await state.loadDiscoveredIdentities('mainnet')
        expect(loadDisc).toBeNull()

        // Fixed: Added network argument
        const clearDisc = await state.clearDiscoveredIdentities('mainnet')
        expect(clearDisc.success).toBe(false)

        const net = await state.getCurrentNetwork()
        expect(net).toBe('mainnet')

        // Void stubs
        await expect(state.logout()).resolves.toBeUndefined()
        await expect(state.saveKeys('mainnet', '', [])).resolves.toBeUndefined()
        expect(state.resetStoreState()).toBeUndefined()
        expect(state.clearConnectionError()).toBeUndefined()
    })
})
