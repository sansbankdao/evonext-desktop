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
        return data.resultSet
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
        return data.resultSet
    }, 'FETCH_TOKEN_TRANSITIONS_FAILED')
}
