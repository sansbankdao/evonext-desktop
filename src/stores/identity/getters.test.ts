// src/stores/identity/getters.test.ts

import { describe, it, expect } from 'vitest'
import { useIdentityGetters } from './getters'
describe('Identity Getters', () => {
    const mockState = (overrides = {}): any => ({
        username: 'alice',
        identityId: 'id123',
        isAuthenticated: true,
        balance: '200000000', // 2 DASH (1 DASH = 100,000,000 Duflones)
        publicKeys: [
            { purpose: 0, data: 'key0' },
            { purpose: 1, data: 'key1' }
        ],
        revision: 1,
        ...overrides
    })
    it('formattedBalance should calculate Dash correctly', () => {
        const state = mockState()
        const result = useIdentityGetters.formattedBalance(state)
        expect(result).toBe('2 DASH')
    })
    it('formattedBalance should handle zero or invalid balance', () => {
        const state0 = mockState({ balance: '0' })
        expect(useIdentityGetters.formattedBalance(state0)).toBe('0 DASH')
        const stateNull = mockState({ balance: null })
        expect(useIdentityGetters.formattedBalance(stateNull)).toBe('0 DASH')
    })
    it('identity snapshot should return correct IIdentity object', () => {
        const state = mockState()
        const snapshot = useIdentityGetters.identity(state)
        expect(snapshot?.username).toBe('alice')
        expect(snapshot?.identityIdx).toBe(0)
    })
    it('displayName should fall back correctly', () => {
        const state = mockState({ displayName: null, username: null })
        expect(useIdentityGetters.displayName(state)).toBe('id123')
    })
    it('should find specific public keys by purpose', () => {
        const state = mockState()
        expect(useIdentityGetters.getAuthPublicKey(state)?.data).toBe('key0')
        expect(useIdentityGetters.getEncryptionPublicKey(state)?.data).toBe('key1')
    })
})
