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
    })

    it('stubs should return expected failure objects', async () => {
        const state = useIdentityState()
        const res = await state.connectWithSeed()
        expect(res.success).toBe(false)
        expect(res.error).toBe('Not implemented')
    })
})
