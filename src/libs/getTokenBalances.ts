// src/libs/getTokenBalances.ts

/* Import modules. */
import { usePlatform } from '@/composables/usePlatform'
import type { TokenBalance } from '@/types'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'

/**
 * Main function to fetch token balances
 */
export async function getTokenBalances(
    identityId: string,
    tokenContractIds: string[]
): Promise<TokenBalance[]> {
    return ErrorBoundary.wrap(async () => {
        if (!identityId || !tokenContractIds?.length) {
            log('warn', 'Invalid parameters:', { identityId, tokenContractIds })
            return []
        }
        log('info', `Fetching token balances for: ${identityId}`, tokenContractIds)
        const { getSDK } = usePlatform()
        const sdk = await getSDK()
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
 * Fetches token balance for a single token contract
 */
export async function getTokenBalance(
    identityId: string,
    tokenContractId: string
): Promise<bigint> {
    return ErrorBoundary.wrap(async () => {
        try {
            const balances = await getTokenBalances(identityId, [tokenContractId])
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
        const balances = await getTokenBalances(identityId, tokenContractIds)
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
