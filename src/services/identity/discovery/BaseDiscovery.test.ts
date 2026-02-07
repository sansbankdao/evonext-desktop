// src/services/identity/discovery/BaseDiscovery.test.ts

import { describe, it, expect } from 'vitest'
import { BaseDiscovery } from './BaseDiscovery'
import type { DiscoveryResult } from '@/types'
class MockDiscovery extends BaseDiscovery {
    async discover(): Promise<DiscoveryResult> {
        return this.createSuccessResult()
    }
    testFormatBalance(b: any) { return this.formatBalance(b) }
    testExtractKeys(k: any[]) { return this.extractAssociatedKeys(k) }
    testIsSeed(i: string) { return this.isSeedPhrase(i) }
    testIsPrivate(i: string) { return this.isPrivateKey(i) }
    testIsPublic(i: string) { return this.isPublicKey(i) }
    testHandleError(e: any, c: string) { return this.handleError(e, c) }
}
describe('BaseDiscovery foundational logic', () => {
    const discovery = new MockDiscovery()
    it('should format varied balance inputs correctly', () => {
        expect(discovery.testFormatBalance(undefined)).toBe('0')
        expect(discovery.testFormatBalance(null)).toBe('0')
        expect(discovery.testFormatBalance(100)).toBe('100')
        expect(discovery.testFormatBalance('500')).toBe('500')
    })
    it('should identify input types accurately', () => {
        const seed12 = 'word '.repeat(12).trim()
        const seed24 = 'word '.repeat(24).trim()
        const wif = 'cT6871Y7Xh58kXG8X7Xh58kXG8X7Xh58kXG8X7Xh58kXG8X7Xh58'
        const hex = 'a'.repeat(64)
        const pubCompressed = '02' + 'f'.repeat(64)
        expect(discovery.testIsSeed(seed12)).toBe(true)
        expect(discovery.testIsSeed(seed24)).toBe(true)
        expect(discovery.testIsPrivate(wif)).toBe(true)
        expect(discovery.testIsPrivate(hex)).toBe(true)
        expect(discovery.testIsPublic(pubCompressed)).toBe(true)
        expect(discovery.testIsSeed('too short')).toBe(false)
    })
    it('should extract associated keys with proper display labels', () => {
        const rawKeys = [
            { purpose: 'AUTHENTICATION', securityLevel: 'MASTER', keyType: 'ECDSA', data: 'xyz' }
        ]
        const result = discovery.testExtractKeys(rawKeys)
        expect(result[0]!.purpose).toBe('Authentication')
        expect(result[0]!.securityLevel).toBe('Master')
    })
    it('should catch and format errors into discovery results', () => {
        const err = new Error('DAPI Down')
        const result = discovery.testHandleError(err, 'Network')
        expect(result.success).toBe(false)
        expect(result.error).toContain('Network: DAPI Down')
    })
})
