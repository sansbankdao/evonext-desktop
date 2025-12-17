// src/libs/getTokenBalances.ts
/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
import type { TokenBalance } from '@/types'

import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import getNetwork from './getNetwork'

/* Initialize SDK. */
let sdk: DashPlatformSDK | null = null

async function getOrInitSDK(): Promise<DashPlatformSDK> {
    const network = await getNetwork()

    if (!sdk) {
        sdk = new DashPlatformSDK({ network })
    }

    return sdk
}

/**
 * Main function to fetch token balances
 */
async function _getTokenBalances(
    identityId: string,
    tokenContractIds: string[]
): Promise<TokenBalance[]> {
    return ErrorBoundary.wrap(async () => {
        if (!identityId || !tokenContractIds?.length) {
            log('warn', 'Invalid parameters:', { identityId, tokenContractIds })
            return []
        }

        log('info', `Fetching token balances for: ${identityId}`, tokenContractIds)

        const sdk = await getOrInitSDK()

        /* Create a new document. */
        const tokensIdentityBalance = await sdk.tokens
            .getIdentityTokensBalances(identityId, tokenContractIds);

        // Convert SDK response to our TokenBalance format
        const tokenBalances: TokenBalance[] = tokensIdentityBalance.map(balance => ({
            tokenId: balance.tokenId,
            balance: BigInt(balance.balance || '0')
        }))

        log('debug', `Found ${tokenBalances.length} token balances`)

        return tokenBalances

    }, 'GET_TOKEN_BALANCES_FAILED')
}

/**
 * Default export (main function)
 */
export default _getTokenBalances

/**
 * Fetches token balance for a single token contract
 */
export async function getTokenBalance(
    identityId: string,
    tokenContractId: string
): Promise<bigint> {
    return ErrorBoundary.wrap(async () => {
        try {
            const balances = await _getTokenBalances(identityId, [tokenContractId])
            const tokenBalance = balances.find(b =>
                b.tokenId.base58() === tokenContractId
            )
            return tokenBalance?.balance || BigInt(0)
        } catch (error) {
            log('error', `Failed to get token balance for ${tokenContractId}:`, error)
            return BigInt(0)
        }
    }, 'GET_TOKEN_BALANCE_FAILED')
}

/**
 * Fetches formatted token balances with human-readable amounts
 */
export async function getFormattedTokenBalances(
    identityId: string,
    tokenContractIds: string[],
    decimals: number = 8
): Promise<Array<{ tokenId: string; balance: bigint; formatted: string }>> {
    return ErrorBoundary.wrap(async () => {
        const balances = await _getTokenBalances(identityId, tokenContractIds)

        return balances.map(balance => {
            const tokenId = balance.tokenId.base58()
            const amount = Number(balance.balance) / Math.pow(10, decimals)

            return {
                tokenId,
                balance: balance.balance,
                formatted: amount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: decimals
                })
            }
        })
    }, 'GET_FORMATTED_TOKEN_BALANCES_FAILED')
}
