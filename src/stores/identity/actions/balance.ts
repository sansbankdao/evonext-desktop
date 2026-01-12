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
                log('warn', '[Balance] No identity loaded, skipping balance fetch')
                return
            }

            try {
                const network = await ensure()
                const identityId = store.identity.id

                log('info', `[Balance] Fetching balance for identity: ${identityId} on ${network}`)

                // 1. Fetch raw balance string from Network
                const rawBalance = await getIdentityBalance(network, identityId)

                // 2. Determine the balance string to use
                // Handle cases where API returns null/undefined but user has 0 balance
                let balanceString = '0'
                if (rawBalance !== null && rawBalance !== undefined) {
                    balanceString = String(rawBalance)
                    log('info', `[Balance] Raw balance received: ${balanceString}`)
                } else {
                    log('warn', `[Balance] API returned null balance for ${identityId}. Defaulting to "0".`)
                }

                // 3. Update RAM State (Store)
                store.balance = balanceString

                const balanceNum = parseInt(balanceString, 10)
                store.balanceBigInt = BigInt(balanceNum)
                store.dashBigInt = store.balanceBigInt / BigInt(100_000_000_000)

                // 4. PERSIST TO RUST BACKEND (The Critical Step)
                // We perform this save regardless of whether the balance changed,
                // to ensure the backend stays synced.
                log('info', `[Balance] Attempting to save to Rust backend...`)

                const updatePayload = {
                    identityId: identityId,
                    identityIdx: store.identity?.identityIdx || 0,
                    username: store.username || identityId,
                    balance: balanceString,
                    revision: store.revision,
                    publicKeys: store.publicKeys || store.identity?.publicKeys || []
                }

                log('debug', `[Balance] Payload prepared: ${JSON.stringify({ ...updatePayload, publicKeys: '...' })}`)

                await store.saveIdentityDataToStore(network, identityId, updatePayload)

                log('info', `[Balance] ✅ Successfully saved updated identity to backend.`)

            } catch (error) {
                log('error', '[Balance] Failed to fetch/save balance:', error)
                // We set to null/undefined on error to signify failure state
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

            log('info', '[Balance] Manually updating balance to:', newBalance)

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
                log('info', '[Balance] ✅ Backend updated via updateBalance helper')
            }
        }, 'UPDATE_BALANCE_FAILED')
    }
})
