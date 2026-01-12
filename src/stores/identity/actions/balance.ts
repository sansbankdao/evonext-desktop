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
                    // 1. UPDATE RAM
                    store.balance = balanceString

                    // 2. CALCULATE DERIVED VALUES
                    const balanceNum = parseInt(balanceString, 10)
                    store.balanceBigInt = BigInt(balanceString)
                    store.dashBigInt = store.balanceBigInt / BigInt(100_000_000_000)

                    // 3. 🔥 CRITICAL FIX: IMMEDIATELY PERSIST TO DISK
                    // This ensures that after app restart, we load this NEW value, not the old one.
                    if (typeof store.saveToStorage === 'function') {
                        try {
                            await store.saveToStorage()
                            log('info', '💾 [balance] Saved new balance to storage:', balanceString)
                        } catch (storageErr) {
                            log('error', '[balance] Failed to save to storage:', storageErr)
                        }
                    }
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

            // Update RAM
            store.balance = newBalance
            store.balanceBigInt = BigInt(newBalance)
            store.dashBigInt = store.balanceBigInt / BigInt(100_000_000_000)

            // 4. 🔥 PERSIST TO DISK IMMEDIATELY
            if (typeof store.saveToStorage === 'function') {
                try {
                    await store.saveToStorage()
                    log('info', '💾 [balance] Saved new balance to storage manually')
                } catch (storageErr) {
                    log('error', '[balance] Failed to save to storage:', storageErr)
                }
            }
        }, 'UPDATE_BALANCE_FAILED')
    }
})
