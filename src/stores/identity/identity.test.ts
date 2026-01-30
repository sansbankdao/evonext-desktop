// src/stores/identity/identity.test.ts

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useIdentityStore } from './index'

describe('Identity Store', () => {
    beforeEach(() => {
        // Creates a fresh store state for every test
        setActivePinia(createPinia())
    })

    it('initializes with a default empty state', () => {
        const store = useIdentityStore()

        // Verifying the state definitions from state.ts exist
        expect(store.identityId).toBeDefined()
        expect(store.publicKeys).toBeInstanceOf(Array)
        expect(store.publicKeys).toHaveLength(0)
    })

    it('returns public keys from state if they are already present', async () => {
        const store = useIdentityStore()

        // 1. Manually seed the state (simulating keys already being loaded)
        const mockKeys = [
            { id: 1, data: 'key_data_1', purpose: 3 },
            { id: 2, data: 'key_data_2', purpose: 2 }
        ]
        store.publicKeys = mockKeys

        // 2. Call the action defined in identity.ts
        // This action has an optimized path: if (store.publicKeys.length > 0) return store.publicKeys
        const result = await store.getPublicKeys()

        // 3. Assertions
        expect(result).toEqual(mockKeys)
        expect(result).toHaveLength(2)
        expect(result[0].id).toBe(1)
    })
})
