// src/services/posts/utils.test.ts

import { describe, it, expect } from 'vitest'
import {
    Base58,
    ensureBase58,
    normalizeDocument,
    getContractId,
    formatTimeAgo,
    generateAvatarUrl
} from './utils'
describe('posts utils', () => {
    describe('Base58', () => {
        it('encodes Uint8Array to base58 correctly', () => {
            const input = new Uint8Array([116, 101, 115, 116])
            expect(Base58.encode(input)).toBe('3yZe7d')
        })
        it('handles leading zeros by encoding them as "1"', () => {
            const input = new Uint8Array([0, 0, 1])
            expect(Base58.encode(input)).toBe('112')
        })
    })
    describe('ensureBase58', () => {
        it('converts base64 strings containing specific characters to base58', () => {
            const input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq='
            const result = ensureBase58(input)
            expect(result).not.toBe(input)
            expect(result).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/)
        })
        it('converts base64 strings containing "/" regardless of length', () => {
            const input = 'a/b'
            const result = ensureBase58(input)
            expect(result).not.toBe(input)
        })
        it('returns input as-is if it does not look like base64', () => {
            const input = 'plain-identifier'
            expect(ensureBase58(input)).toBe(input)
        })
        it('returns empty value if input is empty', () => {
            expect(ensureBase58('')).toBe('')
        })
    })
    describe('normalizeDocument', () => {
        it('handles objects with $ prefix from Dash SDK', () => {
            const mockDoc = {
                $ownerId: 'owner123',
                $createdAt: 1000,
                $type: 'custom_post',
                content: 'hello world'
            }
            const result = normalizeDocument(mockDoc) as any
            expect(result.ownerId).toBe('owner123')
            expect(result.createdAt).toBe(1000)
            expect(result.documentTypeName).toBe('custom_post')
        })
        it('handles plain objects without $ prefix', () => {
            const mockDoc = {
                ownerId: 'owner123',
                createdAt: 2000,
                content: 'plain'
            }
            const result = normalizeDocument(mockDoc)
            expect(result.ownerId).toBe('owner123')
            expect(result.createdAt).toBe(2000)
        })
        it('uses default values for missing optional fields', () => {
            const result = normalizeDocument({ content: 'only content' })
            expect(result.isSensitive).toBe(false)
            expect(result.language).toBe('en')
        })
    })
    describe('getContractId', () => {
        it('returns testnet IDs correctly', () => {
            expect(getContractId('evonext', 'testnet')).toBeDefined()
            expect(getContractId('dashpay', 'testnet')).toBeDefined()
            expect(getContractId('dpns', 'testnet')).toBeDefined()
        })
        it('returns mainnet IDs correctly', () => {
            expect(getContractId('evonext', 'mainnet')).toBeDefined()
        })
    })
    describe('formatTimeAgo', () => {
        const now = Date.now()
        it('returns "Just now" for very recent timestamps', () => {
            expect(formatTimeAgo(now - 30000)).toBe('Just now')
        })
        it('returns minutes ago', () => {
            expect(formatTimeAgo(now - 120000)).toBe('2m ago')
        })
        it('returns hours ago', () => {
            expect(formatTimeAgo(now - 7200000)).toBe('2h ago')
        })
        it('returns days ago', () => {
            expect(formatTimeAgo(now - 172800000)).toBe('2d ago')
        })
        it('returns formatted date string for old timestamps', () => {
            const longAgoDate = new Date('2020-06-15T12:00:00Z')
            const longAgo = longAgoDate.getTime()
            const expected = longAgoDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const result = formatTimeAgo(longAgo)
            expect(result).toBe(expected)
        })
    })
    describe('generateAvatarUrl', () => {
        it('generates a URL based on ownerId and name', () => {
            const url = generateAvatarUrl('abcdef123', 'Alice')
            expect(url).toContain('name=Alice')
            expect(url).toContain('background=abcdef')
        })
        it('uses fallback color if ownerId is not a hex color', () => {
            const url = generateAvatarUrl('zzzzzz', 'Bob')
            expect(url).toContain('background=0ea5e9')
        })
    })
})
