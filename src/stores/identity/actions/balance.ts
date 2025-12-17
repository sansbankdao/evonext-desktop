// src/stores/identity/actions/balance.ts
import { getIdentityBalance } from '@evonext/platform'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import getNetwork from '@/libs/getNetwork'
import { formatDash, dashAmount } from '../../../utils/dash'
import type { IIdentityState } from '@/types'
import type { BalanceResult } from '../types'
export const balanceActions = () => ({
    async fetchBalance(this: any): Promise<BalanceResult> {
        return ErrorBoundary.wrap(async () => {
            const state = this as IIdentityState
            log('info', 'fetchBalance called, identity:', state.identity?.id)
            const network = await getNetwork()
            if (!state.identity?.id) {
                log('warn', 'No identity ID available for balance fetch')
                state.balance = null
                await this.saveToStorage()
                return null
            }
            log('info', 'Fetching balance for identity:', state.identity.id)
            const balanceString = await getIdentityBalance(network, state.identity.id)
            log('info', 'Balance string:', balanceString)
            if (balanceString !== null && balanceString !== '0') {
                state.balance = balanceString  // NOTE: Raw string for storage.
                const balanceBigInt = BigInt(balanceString)
                const dashBigInt = dashAmount(balanceBigInt)
                const dashFormatted = formatDash(balanceBigInt)
                state.balanceBigInt = balanceBigInt
                state.dashBigInt = dashBigInt
                log('info', 'Satoshis BigInt:', balanceBigInt.toString())
                log('info', 'DASH BigInt:', dashBigInt.toString())
                log('info', 'Formatted:', dashFormatted)
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
        }, 'FETCH_BALANCE_FAILED')
    },
})
