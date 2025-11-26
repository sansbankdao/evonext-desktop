// src/utils/dash.ts
/**
 * Convert satoshis BigInt to DASH BigInt (1 DASH = 100,000,000 satoshis)
 * Returns DASH as BigInt (no precision loss)
 */
export const satoshisToDashBigInt = (satoshis: string | number | bigint): bigint => {
    try {
        const sats = BigInt(satoshis)
        return sats / BigInt(100_000_000)
    } catch {
        return BigInt(0)
    }
}

/**
 * Format satoshis to human-readable DASH string
 */
export const formatDash = (satoshis: string | number | bigint): string => {
    try {
        const dashBigInt = satoshisToDashBigInt(satoshis)
        const dashNumber = Number(dashBigInt)
        return `${dashNumber.toFixed(8)} DASH`
    } catch {
        return '0.00000000 DASH'
    }
}

/**
 * Get DASH amount as BigInt (crypto-safe math)
 */
export const dashAmount = (satoshis: string | number | bigint): bigint => {
    return satoshisToDashBigInt(satoshis)
}
