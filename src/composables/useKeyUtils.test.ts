// src/composables/useKeyUtils.test.ts

import { describe, it, expect } from 'vitest'
import { useKeyUtils } from './useKeyUtils'
describe('useKeyUtils', () => {
    const utils = useKeyUtils()
    it('should generate a stable key ID', () => {
        const key = {
            purpose: 0,
            securityLevel: 1,
            keyType: 'ECDSA',
            data: new TextEncoder().encode('test-key-data')
        } as any
        const id = utils.generateKeyId(key, 0)
        expect(id).toContain('0-1-ECDSA-')
    })
    it('should generate key ID using index when data is missing', () => {
        const key = { purpose: 0, securityLevel: 1 } as any
        const id = utils.generateKeyId(key, 5)
        expect(id).toContain('idx5')
    })
    it('should return correct purpose labels', () => {
        expect(utils.getPurposeLabel(0)).toBe('AUTHENTICATION')
        expect(utils.getPurposeLabel(1)).toBe('ENCRYPTION')
        expect(utils.getPurposeLabel(2)).toBe('DECRYPTION')
        expect(utils.getPurposeLabel(3)).toBe('TRANSFER')
        expect(utils.getPurposeLabel(99)).toBe('Purpose 99')
    })
    it('should return correct security labels', () => {
        expect(utils.getSecurityLevelLabel(0)).toBe('MASTER')
        expect(utils.getSecurityLevelLabel(1)).toBe('CRITICAL')
        expect(utils.getSecurityLevelLabel(2)).toBe('HIGH')
        expect(utils.getSecurityLevelLabel(3)).toBe('MEDIUM')
        expect(utils.getSecurityLevelLabel(4)).toBe('LOW')
    })
    it('should return CSS classes for security levels', () => {
        expect(utils.getSecurityLevelClass(0)).toContain('purple')
        expect(utils.getSecurityLevelClass(1)).toContain('red')
        expect(utils.getSecurityLevelClass(2)).toContain('orange')
        expect(utils.getSecurityLevelClass(3)).toContain('amber')
        expect(utils.getSecurityLevelClass(4)).toContain('green')
        expect(utils.getSecurityLevelClass(99)).toContain('gray')
    })
    it('should return badge classes based on purpose', () => {
        expect(utils.getKeyBadgeClass({ purpose: 1 } as any)).toContain('green')
        expect(utils.getKeyBadgeClass({ purpose: 0 } as any)).toContain('blue')
        expect(utils.getKeyBadgeClass({ purpose: 2 } as any)).toContain('purple')
        expect(utils.getKeyBadgeClass({ purpose: 9 } as any)).toContain('gray')
    })
    it('should identify transfer keys', () => {
        expect(utils.hasTransferKey([{ purpose: 3 }] as any)).toBe(true)
        expect(utils.hasTransferKey([{ purpose: 1 }] as any)).toBe(true)
        expect(utils.hasTransferKey([{ purpose: 0 }] as any)).toBe(false)
        expect(utils.hasTransferKey([])).toBe(false)
    })
    it('should parse purpose and security level strings', () => {
        expect(utils.parsePurpose('1')).toBe(1)
        expect(utils.parsePurpose('invalid')).toBe(0)
        expect(utils.parseSecurityLevel('3')).toBe(3)
        expect(utils.parseSecurityLevel('99')).toBe(0)
    })
    it('should get identity display names and initials', () => {
        const identity = { username: 'dashy.dash', displayName: 'Dashy' }
        expect(utils.getIdentityDisplayName(identity)).toBe('Dashy')
        expect(utils.getIdentityInitial(identity)).toBe('D')
        const anon = { username: 'anonymous.dash' }
        expect(utils.getIdentityDisplayName(anon)).toBe('anonymous')
    })
})
