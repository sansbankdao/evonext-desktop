// src/composables/useBalances.ts

import { computed, ref } from 'vue'
import { getIdentityBalance } from '@evonext/platform'
import { usePlatform } from './usePlatform'
import { getAllActiveTokens } from '@/constants'
import { getTokenBalances } from '@/libs/getTokenBalances'
import type { BalanceResult } from '@/types'

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
            const dash = credits / BigInt(100_000_000_000)
            // Get active tokens based on network
            const activeTokens = getAllActiveTokens()
            // Fetch token balances
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

    const getTokenBalance = async (identityId: string, tokenId: string): Promise<bigint> => {
        try {
            const balances = await getBalances(identityId)
            const token = balances.tokens?.find(t => {
                const tokenIdStr = t.tokenId?.base58?.() || t.tokenId
                return tokenIdStr === tokenId
            })
            return token?.balance || BigInt(0)
        } catch (err: any) {
            error.value = err.message || 'Failed to get token balance'
            throw err
        }
    }

    const hasSufficientBalance = async (identityId: string, requiredCredits: bigint): Promise<boolean> => {
        try {
            const balances = await getBalances(identityId)
            return (balances.credits || 0) >= requiredCredits
        } catch {
            return false
        }
    }

    return {
        loading: computed(() => loading.value),
        error: computed(() => error.value),
        getBalances,
        getTokenBalance,
        hasSufficientBalance
    }
}
