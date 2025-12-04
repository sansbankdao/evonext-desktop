// src/libs/satoshi.ts

/**
 * Convert Dash to satoshis
 */
export const toSatoshi = (dash: number): bigint => {
    return BigInt(Math.floor(dash * 100000000))
}

/**
 * Convert satoshis to Dash
 */
export const fromSatoshi = (satoshis: number | bigint): number => {
    const satoshisNum = typeof satoshis === 'bigint' ? Number(satoshis) : satoshis
    return satoshisNum / 100000000
}
