// src/stores/wallet/actions/utils.ts

/* Import modules. */
// import { DUSD_DECIMAL_PLACES, SANS_DECIMAL_PLACES } from '@/constants'

// Conversion constants (these should match what's used in the platform)
export const CREDITS_TO_DUFFS = 1000 // 1000 credits = 1 duff
export const DUFFS_PER_DASH = 100_000_000 // 100,000,000 duffs = 1 DASH

/**
 * Converts atomic/satoshi amount to DASH for display
 */
export const atomicToDash = (atomicAmount: string | number | bigint): number => {
    try {
        // Convert any input to number safely
        const amount = safeNumber(atomicAmount)
        const duffs = amount / CREDITS_TO_DUFFS // 1000 credits = 1 duff
        return duffs / DUFFS_PER_DASH // 100,000,000 duffs = 1 DASH
    } catch {
        return 0
    }
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
export const formatTokenAmount = (
    atomicAmount: number,
    ticker: string,
    decimals: number,
    isPositive: boolean
): string => {
    const amount = atomicAmount / (10 ** decimals)
    const sign = isPositive ? '+' : '-'
    return `${sign}${Math.abs(amount).toFixed(6)} ${ticker}`
}

/**
 * Truncates a hash/address for display
 */
export const truncateAddress = (address: string): string => {
    if (!address) return 'Unknown'
    if (address.length <= 16) return address
    return `${address.slice(0, 8)}...${address.slice(-8)}`
}

/**
 * Safely converts any value to number, returns 0 on error
 */
export const safeNumber = (value: unknown): number => {
    try {
        if (typeof value === 'bigint') {
            return Number(value)
        }

        if (typeof value === 'string') {
            // Handle scientific notation, commas, etc.
            const cleanStr = value.trim().replace(/,/g, '')
            const num = parseFloat(cleanStr)
            return isNaN(num) ? 0 : num
        }

        const num = Number(value)
        return isNaN(num) ? 0 : num
    } catch {
        return 0
    }
}

/**
 * Safely converts any value to BigInt, returns 0n on error
 */
export const safeBigInt = (value: unknown): bigint => {
    try {
        if (typeof value === 'bigint') return value

        if (typeof value === 'number') return BigInt(Math.floor(value))

        if (typeof value === 'string') {
            const trimmed = value.trim()
            if (!trimmed) return 0n

            // Remove decimals and scientific notation
            const cleanStr = trimmed.replace(/[^\d-]/g, '')
            return cleanStr ? BigInt(cleanStr) : 0n
        }

        return 0n
    } catch {
        return 0n
    }
}
