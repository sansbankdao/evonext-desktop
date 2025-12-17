// src/libs/getTokenBalances.ts

/* Import modules. */
import { DashPlatformSDK } from 'dash-platform-sdk'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import { getPlatformEndpoint } from '@/utils/env'
import type { TokenBalance } from '@/types'

/* Default token balance interface */
interface QueryTokenBalance {
    tokenId: string
    balance: bigint
}

/**
 * Fetches token balances for a specific identity and token contracts
 */
export default async (
    identityId: string,
    tokenContractIds: string[]
): Promise<TokenBalance[]> => {
    return ErrorBoundary.wrap(async () => {
        if (!identityId || !tokenContractIds?.length) {
            log('warn', 'Invalid parameters for getTokenBalances:', { identityId, tokenContractIds })
            return []
        }

        log('info', `Fetching token balances for identity: ${identityId}`, tokenContractIds)

        try {
            // Try to fetch via HTTP API first (faster, more reliable)
            const balances = await fetchTokenBalancesViaAPI(identityId, tokenContractIds)
            if (balances.length > 0) {
                log('debug', `Found ${balances.length} token balances via API`)
                return balances
            }

            // Fall back to SDK if API fails or returns no results
            log('debug', 'Falling back to SDK for token balances')
            return await fetchTokenBalancesViaSDK(identityId, tokenContractIds)

        } catch (error) {
            log('error', 'Failed to fetch token balances:', error)
            return []
        }
    }, 'GET_TOKEN_BALANCES_FAILED')
}

/**
 * Fetches token balances via HTTP API (preferred method)
 */
async function fetchTokenBalancesViaAPI(
    identityId: string,
    tokenContractIds: string[]
): Promise<TokenBalance[]> {
    return ErrorBoundary.wrap(async () => {
        const apiEndpoint = getPlatformEndpoint()
        const balances: TokenBalance[] = []

        // Fetch balances for each token contract in parallel
        const promises = tokenContractIds.map(async (contractId) => {
            try {
                const response = await fetch(
                    `${apiEndpoint}/token/${contractId}/balance/${identityId}`
                )

                if (!response.ok) {
                    if (response.status === 404) {
                        // Token might not exist for this identity, return zero balance
                        return {
                            tokenId: { base58: () => contractId },
                            balance: BigInt(0)
                        }
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }

                const data = await response.json() as QueryTokenBalance

                return {
                    tokenId: { base58: () => contractId },
                    balance: BigInt(data.balance || 0)
                }
            } catch (error) {
                log('warn', `Failed to fetch balance for token ${contractId}:`, error)
                // Return zero balance on error
                return {
                    tokenId: { base58: () => contractId },
                    balance: BigInt(0)
                }
            }
        })

        const results = await Promise.all(promises)
        return results.filter(balance => balance !== null) as TokenBalance[]

    }, 'FETCH_TOKEN_BALANCES_VIA_API_FAILED')
}

/**
 * Fetches token balances via DashPlatformSDK (fallback method)
 */
// In src/libs/getTokenBalances.ts, replace the SDK call with HTTP API
async function fetchTokenBalancesViaSDK(
    identityId: string,
    tokenContractIds: string[]
): Promise<TokenBalance[]> {
    return ErrorBoundary.wrap(async () => {
        const balances: TokenBalance[] = []

        for (const contractId of tokenContractIds) {
            try {
                // Try HTTP API first (more reliable)
                const apiEndpoint = getPlatformEndpoint()
                const response = await fetch(
                    `${apiEndpoint}/token/${contractId}/balance/${identityId}`
                )

                if (response.ok) {
                    const data = await response.json()
                    balances.push({
                        tokenId: { base58: () => contractId },
                        balance: BigInt(data.balance || 0)
                    })
                } else {
                    // Fallback to 0 balance
                    balances.push({
                        tokenId: { base58: () => contractId },
                        balance: BigInt(0)
                    })
                }
            } catch (error) {
                console.warn(`Failed to fetch balance for token ${contractId}:`, error)
                balances.push({
                    tokenId: { base58: () => contractId },
                    balance: BigInt(0)
                })
            }
        }

        return balances
    }, 'FETCH_TOKEN_BALANCES_VIA_SDK_FAILED')
}

/**
 * Fetches token balance for a single token contract
 * (Utility function for when you only need one token)
 */
export async function getTokenBalance(
    identityId: string,
    tokenContractId: string
): Promise<bigint> {
    return ErrorBoundary.wrap(async () => {
        const balances = await getTokenBalances(identityId, [tokenContractId])
        const tokenBalance = balances.find(b =>
            b.tokenId.base58() === tokenContractId
        )
        return tokenBalance?.balance || BigInt(0)
    }, 'GET_TOKEN_BALANCE_FAILED')
}

/**
 * Fetches formatted token balances with human-readable amounts
 */
export async function getFormattedTokenBalances(
    identityId: string,
    tokenContractIds: string[],
    decimals: number = 8 // Default to 8 decimals for formatting
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
