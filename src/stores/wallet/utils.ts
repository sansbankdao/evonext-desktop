// src/stores/wallet/utils.ts
/* Import modules. */
// import { DUSD_DECIMAL_PLACES, SANS_DECIMAL_PLACES } from '@/constants'
// import { log } from '@/utils/env'

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
            return trimmed ? BigInt(trimmed) : 0n
        }
        return 0n
    } catch {
        return 0n
    }
}
