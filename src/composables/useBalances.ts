// src/composables/useBalances.ts

import { computed, ref } from 'vue'
import { getIdentityBalance } from '@evonext/platform'
import { usePlatform } from './usePlatform'
import { getAllActiveTokens } from '@/constants'
import { ErrorBoundary } from '@/utils/errors'
import { log } from '@/utils/env'
import type { BalanceResult, TokenBalance } from '@/types'

/**
 * Satoshi/Dash conversion utilities (merged from libs/satoshi.ts)
 */
const toSatoshi = (dash: number): bigint => {
    return BigInt(Math.floor(dash * 100000000))
}

const fromSatoshi = (satoshis: number | bigint): number => {
    const satoshisNum = typeof satoshis === 'bigint' ? Number(satoshis) : satoshis
    return satoshisNum / 100000000
}

/**
 * Token balances utilities (merged from libs/getTokenBalances.ts)
 */
const getTokenBalances = async (
    identityId: string,
    tokenContractIds: string[]
): Promise<TokenBalance[]> => {
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

const getTokenBalance = async (
    identityId: string,
    tokenContractId: string
): Promise<bigint> => {
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

const getFormattedTokenBalances = async (
    identityId: string,
    tokenContractIds: string[],
    decimals: number = 8
): Promise<Array<{ tokenId: string; balance: bigint; formatted: string }>> => {
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

export function useBalances() {
    const platform = usePlatform()
    const loading = ref(false)
    const error = ref<string | null>(null)

    const getBalances = async (identityId: string): Promise<BalanceResult> => {
        loading.value = true
        error.value = null
        try {
            const sdk = await platform.getSDK()
            const network = sdk.network // Get network from SDK
            // Fetch CREDITS balance
            const creditsBalanceSatoshis = await getIdentityBalance(network, identityId)
                .catch(err => {
                    console.error('Failed to fetch identity balance:', err)
                    return null
                })
            const credits = creditsBalanceSatoshis ? BigInt(creditsBalanceSatoshis) : BigInt(0)
            // Preserve original DASH conversion logic (credits → DASH)
            const dash = credits / BigInt(100_000_000_000)
            // Get active tokens based on network
            const activeTokens = getAllActiveTokens()
            // Fetch token balances (now internal)
            const tokens = await getTokenBalances(identityId, activeTokens)
            return {
                credits,
                dash,
                tokens
            }
        } catch (err: any) {
            error.value = err.message || 'Failed to get balances'
            throw err
        } finally {
            loading.value = false
        }
    }

    const hasSufficientBalance = async (identityId: string, requiredCredits: bigint): Promise<boolean> => {
        try {
            const balances = await getBalances(identityId)
            return (balances.credits || 0n) >= requiredCredits
        } catch {
            return false
        }
    }

    return {
        // Merged satoshi utils
        toSatoshi,
        fromSatoshi,
        // Merged token balances utils
        getTokenBalances,
        getTokenBalance,
        getFormattedTokenBalances,
        // Existing state/actions
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        getBalances,
        hasSufficientBalance
    }
}
