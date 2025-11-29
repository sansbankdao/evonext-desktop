// src/stores/identity/actions/balance.ts

import { getIdentityBalance } from '@evonext/platform'
import { formatDash, dashAmount } from '../../../utils/dash'
import type { IState } from '../types'

export const balanceActions = () => ({
    async fetchBalance(this: any) {
        const state = this as IState
        console.log('fetchBalance called, identity:', state.identity?.id)

        if (!state.identity?.id) {
            console.log('No identity ID available for balance fetch')
            state.balance = null

            await this.saveToStorage()

            return null
        }

        try {
            console.log('Fetching balance for identity:', state.identity.id)
            const balanceString = await getIdentityBalance('mainnet', state.identity.id)
            console.log('Balance string:', balanceString)

            if (balanceString !== null && balanceString !== '0') {
                state.balance = balanceString  // Raw string for storage

                const balanceBigInt = BigInt(balanceString)
                const dashBigInt = dashAmount(balanceBigInt)

                // ✅ TypeScript safe - properties exist on IState
                state.balanceBigInt = balanceBigInt
                state.dashBigInt = dashBigInt

                const dashFormatted = formatDash(balanceBigInt)

                console.log('Satoshis BigInt:', balanceBigInt.toString())
                console.log('DASH BigInt:', dashBigInt.toString())
                console.log('Formatted:', dashFormatted)

                return {
                    satoshis: balanceBigInt,
                    dash: dashBigInt,
                    formatted: dashFormatted,
                    raw: balanceString
                }
            } else {
                state.balance = null
                state.balanceBigInt = undefined
                state.dashBigInt = undefined

                await this.saveToStorage()

                return null
            }
        } catch (err) {
            console.error('Failed to fetch identity balance:', err)
            state.balance = null
            state.balanceBigInt = undefined
            state.dashBigInt = undefined

            await this.saveToStorage()

            return null
        }
    },
})
