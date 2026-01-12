// src/stores/wallet/actions/api.ts

/* Import modules. */
import { ErrorBoundary, NetworkError } from '@/utils/errors'
import { PLATFORM_HTTP_API_MAINNET, PLATFORM_HTTP_API_TESTNET } from '@/utils/env'
import type { IdentityTransfer, TokenTransition } from '@/types'

/**
 * Fetches identity transactions (history) from the 3rd party Explorer API
 */
export const fetchIdentityTransactions = async (
    identityId: string,
    limit: number = 20,
    network: string = 'testnet'
): Promise<IdentityTransfer[]> => {
    return ErrorBoundary.wrap(async () => {
        const explorerUrl = network === 'mainnet'
            ? PLATFORM_HTTP_API_MAINNET
            : PLATFORM_HTTP_API_TESTNET

        // This endpoint supports the BATCH type found in your logs
        const response = await fetch(`${explorerUrl}/identity/${identityId}/transactions?page=1&limit=${limit}&order=desc`)

        if (!response.ok) {
            throw new NetworkError(`Explorer API error! status: ${response.status}`)
        }

        const data = await response.json()
        if (data.resultSet && Array.isArray(data.resultSet)) {
            return data.resultSet
        }
        return Array.isArray(data) ? data : []
    }, 'FETCH_EXPLORER_TRANSACTIONS_FAILED')
}

/**
 * RESTORED: placeholder function
 */
export const fetchIdentityTransfers = async (
    _identityId: string,
    _limit: number = 10
): Promise<IdentityTransfer[]> => {
    return ErrorBoundary.wrap(async () => {
        return []
    }, 'FETCH_IDENTITY_TRANSFERS_FAILED')
}

/**
 * RESTORED: Fetches token transitions for a given token contract
 */
export const fetchTokenTransitions = async (
    contractId: string,
    limit: number = 10,
    network: string = 'testnet'
): Promise<TokenTransition[]> => {
    return ErrorBoundary.wrap(async () => {
        const explorerUrl = network === 'mainnet'
            ? PLATFORM_HTTP_API_MAINNET
            : PLATFORM_HTTP_API_TESTNET
        const response = await fetch(`${explorerUrl}/token/${contractId}/transitions?page=1&limit=${limit}&order=desc`)
        if (!response.ok) {
            throw new NetworkError(`Explorer API error! status: ${response.status}`)
        }
        const data = await response.json()
        if (data.resultSet && Array.isArray(data.resultSet)) {
            return data.resultSet
        }
        return Array.isArray(data) ? data : []
    }, 'FETCH_TOKEN_TRANSITIONS_FAILED')
}

/**
 * RESTORED: Fetches the balance of a specific token contract for an identity
 */
export const fetchTokenBalance = async (
    identityId: string,
    contractId: string,
    network: string = 'testnet'
): Promise<bigint> => {
    return ErrorBoundary.wrap(async () => {
        const explorerUrl = network === 'mainnet'
            ? PLATFORM_HTTP_API_MAINNET
            : PLATFORM_HTTP_API_TESTNET
        const response = await fetch(`${explorerUrl}/identity/${identityId}/tokens/${contractId}/balance`)
        if (!response.ok) {
            throw new NetworkError(`Failed to fetch balance for ${contractId}: ${response.status}`)
        }
        const data = await response.json()
        const balanceStr = data.balance || data
        return BigInt(balanceStr)
    }, 'FETCH_TOKEN_BALANCE_FAILED')
}
