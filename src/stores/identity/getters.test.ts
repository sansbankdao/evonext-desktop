// src/stores/identity/getters.test.ts

import { describe, it, expect } from 'vitest'
import { useIdentityGetters } from './getters'
describe('Identity Getters', () => {
    const mockState = (overrides = {}): any => ({
        username: 'alice',
        identityId: 'id123',
        isAuthenticated: true,
        displayName: 'Alice D',
        identityIdx: 0,
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
    it('formattedBalance should handle fractional amounts', () => {
        const state = mockState({ balance: '150000000' })
        const result = useIdentityGetters.formattedBalance(state)
        expect(result).toContain('1.5')
        expect(result).toContain('DASH')
    })
    it('identity snapshot should return correct IIdentity object', () => {
        const state = mockState()
        const snapshot = useIdentityGetters.identity(state)
        expect(snapshot?.username).toBe('alice')
        expect(snapshot?.identityIdx).toBe(0)
    })
    it('identity should return null when no identityId', () => {
        const state = mockState({ identityId: null })
        expect(useIdentityGetters.identity(state)).toBeNull()
    })
    it('displayName should fall back correctly', () => {
        const state = mockState({ displayName: null, username: null })
        expect(useIdentityGetters.displayName(state)).toBe('id123')
    })
    it('displayName should use displayName first', () => {
        const state = mockState()
        expect(useIdentityGetters.displayName(state)).toBe('Alice D')
    })
    it('displayName should fall back to Guest when nothing set', () => {
        const state = mockState({ displayName: null, username: null, identityId: null })
        expect(useIdentityGetters.displayName(state)).toBe('Guest')
    })
    it('should find specific public keys by purpose', () => {
        const state = mockState()
        expect(useIdentityGetters.getAuthPublicKey(state)?.data).toBe('key0')
        expect(useIdentityGetters.getEncryptionPublicKey(state)?.data).toBe('key1')
    })
    it('getAuthPublicKey should return undefined when no key with purpose 0', () => {
        const state = mockState({ publicKeys: [{ purpose: 1, data: 'key1' }] })
        expect(useIdentityGetters.getAuthPublicKey(state)).toBeUndefined()
    })
    it('getEncryptionPublicKey should return undefined when no key with purpose 1', () => {
        const state = mockState({ publicKeys: [{ purpose: 0, data: 'key0' }] })
        expect(useIdentityGetters.getEncryptionPublicKey(state)).toBeUndefined()
    })
    it('getPublicKeyByPurpose should find key by arbitrary purpose', () => {
        const state = mockState({ publicKeys: [
            { purpose: 0, data: 'k0' },
            { purpose: 3, data: 'k3' },
            { purpose: 5, data: 'k5' }
        ]})
        const finder = useIdentityGetters.getPublicKeyByPurpose(state)
        expect(finder(3)?.data).toBe('k3')
        expect(finder(5)?.data).toBe('k5')
        expect(finder(99)).toBeUndefined()
    })
    it('getGreeting should greet by username', () => {
        const state = mockState()
        expect(useIdentityGetters.getGreeting(state)).toBe('Hello, alice!')
    })
    it('getGreeting should fall back to identityId', () => {
        const state = mockState({ username: null })
        expect(useIdentityGetters.getGreeting(state)).toBe('Hello, id123!')
    })
    it('getGreeting should fall back to Guest', () => {
        const state = mockState({ username: null, identityId: null })
        expect(useIdentityGetters.getGreeting(state)).toBe('Hello, Guest!')
    })
    it('isConnectedComputed should require both isAuthenticated and identityId', () => {
        expect(useIdentityGetters.isConnectedComputed(mockState())).toBe(true)
        expect(useIdentityGetters.isConnectedComputed(mockState({ isAuthenticated: false }))).toBe(false)
        expect(useIdentityGetters.isConnectedComputed(mockState({ identityId: null }))).toBe(false)
    })
    it('hasPublicKeys should reflect array length', () => {
        expect(useIdentityGetters.hasPublicKeys(mockState())).toBe(true)
        expect(useIdentityGetters.hasPublicKeys(mockState({ publicKeys: [] }))).toBe(false)
    })
    it('publicKeysCount should return correct count', () => {
        expect(useIdentityGetters.publicKeysCount(mockState())).toBe(2)
        expect(useIdentityGetters.publicKeysCount(mockState({ publicKeys: [] }))).toBe(0)
        expect(useIdentityGetters.publicKeysCount(mockState({ publicKeys: null }))).toBe(0)
    })
})
