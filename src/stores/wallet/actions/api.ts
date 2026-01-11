// src/stores/wallet/actions/api.ts

/* Import modules. */
import { ErrorBoundary, NetworkError } from '@/utils/errors'
import { PLATFORM_HTTP_API_MAINNET, PLATFORM_HTTP_API_TESTNET } from '@/utils/env'

/* Import types. */
import type { IdentityTransfer, TokenTransition } from '@/types'

/**
 * Fetches identity transactions (history) from the 3rd party Explorer API
 * NOTE: Uses the /transfers endpoint which returns { resultSet: [...] }
 */
export const fetchIdentityTransactions = async (
    identityId: string,
    limit: number = 20,
    network: string = 'testnet' // FIX: Explicit default to fix build errors
): Promise<IdentityTransfer[]> => {
    return ErrorBoundary.wrap(async () => {
        // FIX: Dynamic endpoint selection based on passed network or explicit prop
        // If 'testnet' is passed, we use testnet. Otherwise we use store.
        const explorerUrl = network === 'mainnet'
            ? PLATFORM_HTTP_API_MAINNET
            : PLATFORM_HTTP_API_TESTNET
        const response = await fetch(`${explorerUrl}/identity/${identityId}/transfers?page=1&limit=${limit}&order=desc`)
        if (!response.ok) {
            throw new NetworkError(`Explorer API error! status: ${response.status}`)
        }
        const data = await response.json()
        // Explorer API returns { resultSet: [...], pagination: {...} }
        if (data.resultSet && Array.isArray(data.resultSet)) {
            return data.resultSet
        }
        // Fallback: Some responses might wrap the array directly
        if (Array.isArray(data)) {
            return data
        }
        return []
    }, 'FETCH_EXPLORER_TRANSACTIONS_FAILED')
}
/**
 * Fetches identity credit transfers for a given identity (Platform Native)
 * NOTE: This uses the Platform API (DapiClient / internal implementation), not Explorer API
 * The response shape for Platform API is different from Explorer API.
 */
export const fetchIdentityTransfers = async (
    _identityId: string,
    _limit: number = 10
): Promise<IdentityTransfer[]> => {
    // NOTE: This function might need to be updated to use the SDK or correct API endpoint
    // if your platform API returns the same format as Explorer API:
    // return await fetchIdentityTransactions(identityId, limit, network)
    // Placeholder for now to maintain interface compatibility until Platform API route is verified
    return ErrorBoundary.wrap(async () => {
        return []
    }, 'FETCH_IDENTITY_TRANSFERS_FAILED')
}
/**
 * Fetches token transitions for a given token contract
 * NOTE: Uses /token/{id}/transitions endpoint
 */
export const fetchTokenTransitions = async (
    contractId: string,
    limit: number = 10,
    network: string = 'testnet' // FIX: Explicit default
): Promise<TokenTransition[]> => {
    return ErrorBoundary.wrap(async () => {
        // FIX: Dynamic endpoint selection
        const explorerUrl = network === 'mainnet'
            ? PLATFORM_HTTP_API_MAINNET
            : PLATFORM_HTTP_API_TESTNET
        const response = await fetch(`${explorerUrl}/token/${contractId}/transitions?page=1&limit=${limit}&order=desc`)
        if (!response.ok) {
            throw new NetworkError(`Explorer API error! status: ${response.status}`)
        }
        const data = await response.json()
        // Response shape: { resultSet: [...], pagination: {...} }
        if (data.resultSet && Array.isArray(data.resultSet)) {
            return data.resultSet
        }
        if (Array.isArray(data)) {
            return data
        }
        return []
    }, 'FETCH_TOKEN_TRANSITIONS_FAILED')
}
/**
 * Fetches the balance of a specific token contract for an identity
 */
export const fetchTokenBalance = async (
    identityId: string,
    contractId: string,
    network: string = 'testnet' // FIX: Explicit default
): Promise<bigint> => {
    return ErrorBoundary.wrap(async () => {
        // FIX: Dynamic endpoint selection
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
