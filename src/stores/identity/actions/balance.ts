// src/stores/identity/actions/balance.ts

import { getIdentityBalance } from '@evonext/platform'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { useNetwork } from '@/composables'

export const balanceActions = () => ({
    async fetchBalance(this: any) {
        const store = this
        const { ensure } = useNetwork()

        return ErrorBoundary.wrap(async () => {
            log('info', 'fetchBalance called, identity:', store.identity?.id)

            if (!store.identity?.id) {
                log('warn', 'No identity loaded, skipping balance fetch')
                return
            }

            try {
                const network = await ensure()
                const identityId = store.identity.id

                log('info', 'Fetching balance for identity:', identityId)

                const balanceString = await getIdentityBalance(network, identityId)

                if (balanceString) {
                    store.balance = balanceString
                    store.balanceBigInt = BigInt(balanceString)
                    store.dashBigInt = store.balanceBigInt / BigInt(100_000_000_000)
                    log('info', 'Balance fetched successfully:', balanceString)
                } else {
                    log('warn', 'No balance found for identity')
                    store.balance = null
                    store.balanceBigInt = undefined
                    store.dashBigInt = undefined
                }
            } catch (error) {
                log('error', 'Failed to fetch balance:', error)
                store.balance = null
                store.balanceBigInt = undefined
                store.dashBigInt = undefined
                throw error
            }
        }, 'FETCH_BALANCE_FAILED')
    },

    /**
     * Helper to update balance from external source (e.g., after transaction)
     */
    async updateBalance(this: any, newBalance: string) {
        const store = this

        return ErrorBoundary.wrap(async () => {
            if (!newBalance) {
                throw new Error('Invalid balance string')
            }

            log('info', 'Manually updating balance to:', newBalance)

            store.balance = newBalance
            store.balanceBigInt = BigInt(newBalance)
            store.dashBigInt = store.balanceBigInt / BigInt(100_000_000_000)

            // Optionally save to storage
            if (typeof store.saveToStorage === 'function') {
                await store.saveToStorage()
            }
        }, 'UPDATE_BALANCE_FAILED')
    }
})
