// src/stores/wallet/actions/utils.test.ts

import { describe, it, expect } from 'vitest'
import {
    atomicToDash,
    formatDashAmount,
    formatTokenAmount,
    truncateAddress,
    safeNumber,
    safeBigInt,
    CREDITS_TO_DUFFS,
    DUFFS_PER_DASH
} from './utils'

describe('Wallet Utils', () => {
    describe('constants', () => {
        it('should have correct conversion constants', () => {
            expect(CREDITS_TO_DUFFS).toBe(1000)
            expect(DUFFS_PER_DASH).toBe(100_000_000)
        })
    })

    describe('atomicToDash', () => {
        it('should convert atomic credits to DASH', () => {
            // 100_000_000_000 credits = 100_000_000 duffs = 1 DASH
            expect(atomicToDash(100_000_000_000)).toBe(1)
        })

        it('should handle string input', () => {
            expect(atomicToDash('100000000000')).toBe(1)
        })

        it('should handle bigint input', () => {
            expect(atomicToDash(BigInt(100_000_000_000))).toBe(1)
        })

        it('should handle zero', () => {
            expect(atomicToDash(0)).toBe(0)
        })

        it('should return 0 on invalid input', () => {
            expect(atomicToDash('invalid')).toBe(0)
        })
    })

    describe('formatDashAmount', () => {
        it('should format positive amounts', () => {
            expect(formatDashAmount(1.5, true)).toBe('+1.500000 DASH')
        })

        it('should format negative amounts', () => {
            expect(formatDashAmount(0.001, false)).toBe('-0.001000 DASH')
        })

        it('should format zero', () => {
            expect(formatDashAmount(0, true)).toBe('+0.000000 DASH')
        })
    })

    describe('formatTokenAmount', () => {
        it('should format token with custom decimals', () => {
            expect(formatTokenAmount(1000000, 'DUSD', 6, true)).toBe('+1.000000 DUSD')
        })

        it('should format negative token amount', () => {
            expect(formatTokenAmount(500000, 'SANS', 6, false)).toBe('-0.500000 SANS')
        })

        it('should handle zero decimals', () => {
            expect(formatTokenAmount(42, 'TOK', 0, true)).toBe('+42.000000 TOK')
        })
    })

    describe('truncateAddress', () => {
        it('should truncate long addresses', () => {
            const addr = '1234567890abcdef1234567890abcdef'
            const result = truncateAddress(addr)
            expect(result).toBe('12345678...0abcdef')
        })

        it('should return short addresses unchanged', () => {
            expect(truncateAddress('short')).toBe('short')
        })

        it('should return Unknown for empty string', () => {
            expect(truncateAddress('')).toBe('Unknown')
        })

        it('should handle exactly 16 char address', () => {
            expect(truncateAddress('1234567890123456')).toBe('1234567890123456')
        })
    })

    describe('safeNumber', () => {
        it('should convert number', () => {
            expect(safeNumber(42)).toBe(42)
        })

        it('should convert string', () => {
            expect(safeNumber('123.45')).toBe(123.45)
        })

        it('should convert bigint', () => {
            expect(safeNumber(BigInt(999))).toBe(999)
        })

        it('should handle string with commas', () => {
            expect(safeNumber('1,000,000')).toBe(1000000)
        })

        it('should return 0 for NaN string', () => {
            expect(safeNumber('not-a-number')).toBe(0)
        })

        it('should return 0 for null', () => {
            expect(safeNumber(null)).toBe(0)
        })

        it('should return 0 for undefined', () => {
            expect(safeNumber(undefined)).toBe(0)
        })

        it('should handle negative numbers', () => {
            expect(safeNumber(-42)).toBe(-42)
        })

        it('should handle string with spaces', () => {
            expect(safeNumber('  100  ')).toBe(100)
        })
    })

    describe('safeBigInt', () => {
        it('should pass through bigint', () => {
            expect(safeBigInt(BigInt(42))).toBe(42n)
        })

        it('should convert number to bigint', () => {
            expect(safeBigInt(42)).toBe(42n)
        })

        it('should floor float to bigint', () => {
            expect(safeBigInt(42.9)).toBe(42n)
        })

        it('should convert string to bigint', () => {
            expect(safeBigInt('12345')).toBe(12345n)
        })

        it('should return 0n for empty string', () => {
            expect(safeBigInt('')).toBe(0n)
        })

        it('should return 0n for whitespace string', () => {
            expect(safeBigInt('   ')).toBe(0n)
        })

        it('should strip non-digit chars from string', () => {
            expect(safeBigInt('1,000')).toBe(1000n)
        })

        it('should return 0n for null', () => {
            expect(safeBigInt(null)).toBe(0n)
        })

        it('should return 0n for undefined', () => {
            expect(safeBigInt(undefined)).toBe(0n)
        })

        it('should return 0n for non-numeric string', () => {
            expect(safeBigInt('abc')).toBe(0n)
        })

        it('should handle string with decimals', () => {
            expect(safeBigInt('123.456')).toBe(123456n)
        })
    })
})
