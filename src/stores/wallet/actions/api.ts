// src/stores/wallet/actions/api.ts

/* Import modules. */
import { ErrorBoundary, NetworkError } from '@/utils/errors'
import { getPlatformEndpoint } from '@/utils/env'

/* Import types. */
import type { IdentityTransfer, TokenTransition, ApiResponse } from '@/types/wallet'

/**
 * Fetches identity credit transfers for a given identity
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
        // FIX: Use 'data' or 'result' instead of 'resultSet'
        // If 'data' is the array directly, return it.
        // If 'data' is an object with a 'result' property, access that.
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
        // FIX: Same as above
        if (Array.isArray(data)) {
            return data
        }
        return (data as any).result || []
    }, 'FETCH_TOKEN_TRANSITIONS_FAILED')
}

/**
 * Fetches the balance for a specific token contract owned by an identity
 *
 * This function queries the API for the raw balance. Ensure the decimals
 * are handled correctly by the caller based on the Token's specific configuration.
 */
export const fetchTokenBalance = async (
    identityId: string,
    contractId: string,
): Promise<bigint> => {
    return ErrorBoundary.wrap(async () => {
        const apiEndpoint = getPlatformEndpoint()
        // Note: The specific endpoint structure for token balance might vary.
        // This assumes a generic pattern or known structure from the platform.
        // If the API returns a JSON with 'balance' field (string or number), we convert to BigInt.
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
