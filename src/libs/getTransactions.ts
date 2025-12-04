// src/libs/getTransactions.ts

/* Initialize constants. */
const API_BASE_URL = 'https://platform-explorer.pshenmic.dev'

interface IdentityTransfer {
    amount: number
    sender: string | null
    recipient: string
    timestamp: string
    txHash: string
    type: string
    blockHash: string
    gasUsed: number
}

interface TokenTransition {
    amount: number
    recipient: string
    owner: {
        identifier: string
        aliases: Array<{
            alias: string
            contested: boolean
            documentId: string
            status: string
            timestamp: string
        }>
    }
    action: string
    stateTransitionHash: string
    timestamp: string
    publicNote: string | null
}

interface ApiResponse<T> {
    resultSet: T[]
    pagination: {
        page: number
        limit: number
        total: number
    }
}

/**
 * Fetches identity credit transfers for a given identity
 */
export const fetchIdentityTransfers = async (identityId: string, limit: number = 10): Promise<IdentityTransfer[]> => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/identity/${identityId}/transfers?page=1&limit=${limit}&order=desc`
        )

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json() as ApiResponse<IdentityTransfer>
        return data.resultSet
    } catch (error) {
        console.error('Failed to fetch identity transfers:', error)
        return []
    }
}

/**
 * Fetches token transitions for a given token contract
 */
export const fetchTokenTransitions = async (contractId: string, limit: number = 10): Promise<TokenTransition[]> => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/token/${contractId}/transitions?page=1&limit=${limit}&order=desc`
        )

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json() as ApiResponse<TokenTransition>
        return data.resultSet
    } catch (error) {
        console.error('Failed to fetch token transitions:', error)
        return []
    }
}

/**
 * Converts atomic/satoshi amount to DASH for display
 */
export const atomicToDash = (atomicAmount: number): number => {
    const duffs = atomicAmount / 1000 // 1000 credits = 1 duff
    return duffs / 100000000 // 100,000,000 duffs = 1 DASH
}

/**
 * Formats a DASH amount with sign and ticker
 */
export const formatDashAmount = (amount: number, isPositive: boolean): string => {
    const sign = isPositive ? '+' : '-'
    return `${sign}${Math.abs(amount).toFixed(6)} DASH`
}

/**
 * Formats a token amount with sign and ticker
 */
export const formatTokenAmount = (atomicAmount: number, ticker: string, decimals: number, isPositive: boolean): string => {
    const amount = atomicAmount / (10 ** decimals)
    const sign = isPositive ? '+' : '-'
    return `${sign}${Math.abs(amount).toFixed(6)} ${ticker}`
}

/**
 * Truncates a hash/address for display
 */
export const truncateAddress = (address: string): string => {
    if (address.length <= 16) return address
    return `${address.slice(0, 8)}...${address.slice(-8)}`
}
