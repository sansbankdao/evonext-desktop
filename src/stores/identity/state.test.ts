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

        // Execute all stubs to cover lines 35-55
        const seedRes = await state.connectWithSeed()
        expect(seedRes.success).toBe(false)

        const keyRes = await state.connectWithSingleKey()
        expect(keyRes.success).toBe(false)

        const writeRes = await state.connectWriteOnlyFromDiscovered()
        expect(writeRes.success).toBe(false)

        const switchRes = await state.switchIdentity()
        expect(switchRes.success).toBe(false)

        const discRes = await state.saveDiscoveredIdentities()
        expect(discRes.savedCount).toBe(0)

        const loadDisc = await state.loadDiscoveredIdentities()
        expect(loadDisc).toBeNull()

        const clearDisc = await state.clearDiscoveredIdentities()
        expect(clearDisc.success).toBe(false)

        const net = await state.getCurrentNetwork()
        expect(net).toBe('mainnet')

        // Void stubs
        expect(state.logout()).resolves.toBeUndefined()
        expect(state.saveKeys()).resolves.toBeUndefined()
        expect(state.resetStoreState()).toBeUndefined()
        expect(state.clearConnectionError()).toBeUndefined()
    })
})
