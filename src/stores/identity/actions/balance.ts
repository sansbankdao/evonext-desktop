import { getIdentityBalance } from '@evonext/platform'
import { ErrorBoundary } from '@/utils/errors'
import { useNetwork } from '@/composables'
import { debugLogger } from '@/utils/debugLogger'
export const balanceActions = () => ({
    async fetchBalance(this: any) {
        const store = this
        const { ensure } = useNetwork()
        return ErrorBoundary.wrap(async () => {
            debugLogger.log('[Balance] fetchBalance called', 'info')
            if (!store.identity?.identityId) {
                debugLogger.log('[Balance] No identity loaded, skipping', 'warn')
                return
            }
            try {
                const network = await ensure()
                const identityId = store.identity.identityId
                debugLogger.log(`[Balance] Fetching for ${identityId} on ${network}`, 'info')
                // 1. Fetch raw balance
                const rawBalance = await getIdentityBalance(network, identityId)
                let balanceString = '0'
                if (rawBalance !== null && rawBalance !== undefined) {
                    balanceString = String(rawBalance)
                    debugLogger.log(`[Balance] Raw balance received: ${balanceString}`, 'info')
                } else {
                    debugLogger.log('[Balance] API returned null, defaulting to 0', 'warn')
                }
                // 2. Update RAM
                store.balance = balanceString
                const balanceNum = parseInt(balanceString, 10)
                store.balanceBigInt = BigInt(balanceNum)
                store.dashBigInt = store.balanceBigInt / BigInt(100_000_000_000)
                // 3. Persist to Backend
                debugLogger.log('[Balance] Attempting to save to Rust backend...', 'info')
                const updatePayload = {
                    identityId: identityId,
                    identityIdx: store.identity?.identityIdx || 0,
                    username: store.username || identityId,
                    balance: balanceString,
                    revision: store.revision,
                    publicKeys: store.publicKeys || store.identity?.publicKeys || []
                }
                // This function now properly invokes the Rust command
                await store.saveIdentityDataToStore(network, identityId, updatePayload)
                debugLogger.log('[Balance] ✅ Successfully saved identity to backend', 'info')
            } catch (error) {
                debugLogger.log(`[Balance] Error: ${error}`, 'error')
                store.balance = null
                store.balanceBigInt = undefined
                store.dashBigInt = undefined
                throw error
            }
        }, 'FETCH_BALANCE_FAILED')
    },
    async updateBalance(this: any, newBalance: string) {
        const store = this
        return ErrorBoundary.wrap(async () => {
            if (!newBalance) {
                throw new Error('Invalid balance string')
            }
            debugLogger.log(`[Balance] Manual update to: ${newBalance}`, 'info')
            store.balance = newBalance
            store.balanceBigInt = BigInt(newBalance)
            store.dashBigInt = store.balanceBigInt / BigInt(100_000_000_000)
            const network = await store.getCurrentNetwork()
            const identityId = store.identity?.identityId
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
                debugLogger.log('[Balance] ✅ Backend updated manually', 'info')
            }
        }, 'UPDATE_BALANCE_FAILED')
    }
})
