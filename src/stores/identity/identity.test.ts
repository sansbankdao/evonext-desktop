// src/stores/identity/identity.test.ts

import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach } from 'vitest'
import { useIdentityStore } from './index' // Adjust path accordingly

describe('Identity Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('successfully saves an identity', async () => {
        const store = useIdentityStore()
        // This will trigger the mockIPC defined in setup.ts
        await store.saveIdentity({
            identityId: 'test-id',
            username: 'tester'
        })

        expect(store.currentId).toBe('test-id')
        expect(store.error).toBeNull()
    })
})
