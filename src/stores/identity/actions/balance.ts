// src/stores/identity/actions/balance.ts

import { getIdentityBalance } from '@evonext/platform'
import { useSystemStore } from '../../system'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import getNetwork from '@/libs/getNetwork'

// Remove: import type { BalanceResult } from '../types'

export const balanceActions = () => ({
    async fetchBalance(this: any) {
        return ErrorBoundary.wrap(async () => {
            const state = this as any
            const system = useSystemStore()

            log('info', 'fetchBalance called, identity:', state.identity?.id)

            if (!state.identity?.id) {
                log('warn', 'No identity loaded, skipping balance fetch')
                return
            }

            try {
                const network = await getNetwork()
                log('info', 'Fetching balance for identity:', state.identity.id)

                // Cast network to SupportedNetwork
                const balanceString = await getIdentityBalance(network as any, state.identity.id)

                if (balanceString) {
                    state.balance = balanceString
                    state.balanceBigInt = BigInt(balanceString)
                    state.dashBigInt = state.balanceBigInt / BigInt(100_000_000_000)
                    log('info', 'Balance fetched successfully:', balanceString)
                } else {
                    log('warn', 'No balance found for identity')
                    state.balance = null
                    state.balanceBigInt = undefined
                    state.dashBigInt = undefined
                }
            } catch (error) {
                log('error', 'Failed to fetch balance:', error)
                state.balance = null
                state.balanceBigInt = undefined
                state.dashBigInt = undefined
                throw error
            }
        }, 'FETCH_BALANCE_FAILED')
    }
})
