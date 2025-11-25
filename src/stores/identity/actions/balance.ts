// src/stores/identity/actions/balance.ts

import { getIdentityBalance } from '@evonext/platform'
export const balanceActions = (state: any, store: any) => ({
    async fetchBalance(): Promise<string | null> {
        console.log('fetchBalance called, identity:', state.identity?.id)
        if (!state.identity?.id) {
            console.log('No identity ID available for balance fetch')
            state.balance = null
            await store.saveToStorage()
            return null
        }
        try {
            console.log('Fetching balance for identity:', state.identity.id)
            const balance = await getIdentityBalance(state.identity.id)
            console.log('Balance result:', balance)
            state.balance = balance
            await store.saveToStorage()
            return balance
        } catch (err) {
            console.error('Failed to fetch identity balance:', err)
            state.balance = null
            await store.saveToStorage()
            return null
        }
    },
})
