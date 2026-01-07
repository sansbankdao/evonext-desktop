// src/stores/wallet/actions/api.ts
/* Import modules. */
import { ErrorBoundary, NetworkError } from '@/utils/errors'
import { getPlatformEndpoint } from '@/utils/env'
/* Import types. */
import type { IdentityTransfer, TokenTransition, ApiResponse } from '@/types/wallet'
const EXPLORER_API_URL = 'https://platform-explorer.pshenmic.dev'
/**
 * Fetches identity transactions (history) from the 3rd party Explorer API
 */
export const fetchIdentityTransactions = async (
    identityId: string,
    limit: number = 20,
): Promise<any[]> => {
    return ErrorBoundary.wrap(async () => {
        // NOTE: Using the explorer API provided in requirements
        const response = await fetch(
            `${EXPLORER_API_URL}/identity/${identityId}/transactions?page=1&limit=${limit}&order=desc`
        )
        if (!response.ok) {
            throw new NetworkError(`Explorer API error! status: ${response.status}`)
        }
        const data = await response.json()
        // Explorer API returns { resultSet: [...] } or just array
        if (data.resultSet && Array.isArray(data.resultSet)) {
            return data.resultSet
        }
        if (Array.isArray(data)) {
            return data
        }
        return []
    }, 'FETCH_EXPLORER_TRANSACTIONS_FAILED')
}
/**
 * Fetches identity credit transfers for a given identity (Platform Native)
 */
export const fetchIdentityTransfers = async (
    identityId: string,
    limit: number = 10,
): Promise<IdentityTransfer[]> => {
    return ErrorBoundary.wrap(async () => {
        const apiEndpoint = getPlatformEndpoint()
        const response = await fetch(
            `${apiEndpoint}/identity/${identityId}/transfers?page=1&limit=${limit}&order=desc`
        )
        if (!response.ok) {
            throw new NetworkError(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json() as ApiResponse<IdentityTransfer>
        if (Array.isArray(data)) {
            return data
        }
        return (data as any).result || []
    }, 'FETCH_IDENTITY_TRANSFERS_FAILED')
}
/**
 * Fetches token transitions for a given token contract
 */
export const fetchTokenTransitions = async (
    contractId: string,
    limit: number = 10,
): Promise<TokenTransition[]> => {
    return ErrorBoundary.wrap(async () => {
        const apiEndpoint = getPlatformEndpoint()
        const response = await fetch(
            `${apiEndpoint}/token/${contractId}/transitions?page=1&limit=${limit}&order=desc`
        )
        if (!response.ok) {
            throw new NetworkError(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json() as ApiResponse<TokenTransition>
        if (Array.isArray(data)) {
            return data
        }
        return (data as any).result || []
    }, 'FETCH_TOKEN_TRANSITIONS_FAILED')
}
/**
 * Fetches the balance for a specific token contract owned by an identity
 */
export const fetchTokenBalance = async (
    identityId: string,
    contractId: string,
): Promise<bigint> => {
    return ErrorBoundary.wrap(async () => {
        const apiEndpoint = getPlatformEndpoint()
        const response = await fetch(
            `${apiEndpoint}/identity/${identityId}/tokens/${contractId}/balance`
        )
        if (!response.ok) {
            throw new NetworkError(`Failed to fetch balance for ${contractId}: ${response.status}`)
        }
        const data = await response.json()
        const balanceStr = data.balance || data
        return BigInt(balanceStr)
    }, 'FETCH_TOKEN_BALANCE_FAILED')
}
