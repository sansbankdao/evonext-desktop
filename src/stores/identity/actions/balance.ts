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

                // 1. Fetch raw balance string from Network
                const balanceString = await getIdentityBalance(network, identityId)

                if (balanceString) {
                    // 2. Update RAM State (Store)
                    store.balance = balanceString

                    // const balanceNum = parseInt(balanceString, 10)
                    store.balanceBigInt = BigInt(balanceString)
                    store.dashBigInt = store.balanceBigInt / BigInt(100_000_000_000)

                    // 3. PERSIST TO RUST BACKEND (The Fix)
                    // We must treat this refresh like a connection update to ensure
                    // the backend file (identities map) stays in sync with the chain.
                    log('info', 'Persisting updated balance to Rust backend...')

                    // Prepare the payload expected by saveIdentityDataToStore (and subsequently Rust)
                    // We use the current store values for keys/username/revision to ensure we don't overwrite them
                    // unless we specifically fetched them. Here we are primarily updating Balance.
                    const updatePayload = {
                        identityId: identityId,
                        identityIdx: store.identity?.identityIdx || 0,
                        username: store.username || identityId,
                        balance: balanceString, // The NEW balance
                        revision: store.revision,
                        publicKeys: store.publicKeys || store.identity?.publicKeys || []
                    }

                    // Call the unified action which triggers the Tauri command
                    await store.saveIdentityDataToStore(network, identityId, updatePayload)

                    log('info', 'Successfully updated Identity backend balance.')
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

            // PERSIST TO RUST BACKEND
            const network = await store.getCurrentNetwork()
            const identityId = store.identity?.id

            if (identityId && network) {
                const updatePayload = {
                    identityId: identityId,
                    identityIdx: store.identity?.identityIdx || 0,
                    username: store.username || identityId,
                    balance: newBalance,
                    revision: store.revision,
                    publicKeys: store.publicKeys || store.identity?.publicKeys || []
                }
                await store.saveIdentityDataToStore(network, identityId, updatePayload)
                log('info', 'Backend updated via updateBalance helper')
            }
        }, 'UPDATE_BALANCE_FAILED')
    }
})
