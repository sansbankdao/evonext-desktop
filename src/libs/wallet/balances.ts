// src/libs/wallet/balances.ts

import { getIdentityBalance } from '@evonext/platform'
import { WalletBase } from './base'
import { getAllActiveTokens } from '@/constants'
import { log } from '@/utils/env'
import { ErrorBoundary } from '@/utils/errors'
import getTokenBalances from '../getTokenBalances'
import type { BalanceResult } from '@/types'

export class BalanceChecker extends WalletBase {
    async getBalances(identityId: string): Promise<BalanceResult> {
        return ErrorBoundary.wrap(async () => {
            if (!this.sdk) {
                await this.initialize()
            }
            // const config = this.getNetworkConfig()
            log('info', `Fetching balances for identity: ${identityId} on ${this.network}`)
            // Fetch CREDITS balance
            const creditsBalanceSatoshis = await getIdentityBalance(this.network, identityId)
                .catch(err => {
                    log('error', 'Failed to fetch identity balance:', err)
                    return null
                })
            const credits = creditsBalanceSatoshis ? BigInt(creditsBalanceSatoshis) : BigInt(0)
            const dash = credits / BigInt(100_000_000_000) // Convert to DASH (12 decimals)
            // Get active tokens based on network
            const activeTokens = getAllActiveTokens()
            // Fetch token balances
            const tokens = await getTokenBalances(identityId, activeTokens)
            log('info', 'Token balances retrieved:', tokens.length)
            return {
                credits,
                dash,
                tokens
            }
        }, 'GET_BALANCES_FAILED')
    }
    async getBalanceForToken(identityId: string, tokenId: string): Promise<bigint> {
        return ErrorBoundary.wrap(async () => {
            const balances = await this.getBalances(identityId)
            const token = balances.tokens.find(t => {
                const tokenIdStr = t.tokenId?.base58?.() || t.tokenId
                return tokenIdStr === tokenId
            })
            return token?.balance || BigInt(0)
        }, 'GET_TOKEN_BALANCE_FAILED')
    }
    async hasSufficientBalance(identityId: string, requiredCredits: bigint): Promise<boolean> {
        try {
            const balances = await this.getBalances(identityId)
            return balances.credits >= requiredCredits
        } catch {
            return false
        }
    }
}
