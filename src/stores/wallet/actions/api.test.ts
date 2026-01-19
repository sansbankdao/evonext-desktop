// src/stores/wallet/actions/api.test.ts

import { setActivePinia, createPinia } from 'pinia'
import { useWalletStore } from '../index'
import { describe, it, expect, beforeEach } from 'vitest'

describe('Wallet Store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it('updates balance correctly', async () => {
        const store = useWalletStore()
        // Assuming you have an action that calls the mocked invoke
        await store.fetchBalance()
        expect(store.balance.total).toBe(100)
    })
})
