// src/stores/identity/actions/balance.ts

import { getIdentityBalance } from '@evonext/platform'
import type { State } from '../types'
export const balanceActions = () => ({
    async fetchBalance(this: any) {
        const state = this as State
        console.log('fetchBalance called, identity:', state.identity?.id)
        if (!state.identity?.id) {
            console.log('No identity ID available for balance fetch')
            state.balance = null
            await this.saveToStorage()
            return null
        }
        try {
            console.log('Fetching balance for identity:', state.identity.id)
            const balance = await getIdentityBalance(state.identity.id)
            console.log('Balance result:', balance)
            state.balance = balance
            await this.saveToStorage()
            return balance
        } catch (err) {
            console.error('Failed to fetch identity balance:', err)
            state.balance = null
            await this.saveToStorage()
            return null
        }
    },
})
