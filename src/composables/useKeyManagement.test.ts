// src/composables/useKeyManagement.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useKeyManagement } from './useKeyManagement'
import { invoke } from '@/utils/tauri'
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
vi.mock('./useNetwork', () => ({
    useNetwork: () => ({
        ensure: vi.fn().mockResolvedValue('testnet')
    })
}))
describe('useKeyManagement', () => {
    const {
        getPrivateKeys,
        getKeyByPurpose,
        getTransferKey,
        deriveKey
    } = useKeyManagement()
    beforeEach(() => {
        vi.clearAllMocks()
    })
    it('should load and filter private keys for an identity', async () => {
        const mockKeystore = {
            identities: {
                'id1': [
                    { privateKey: 'key0', purpose: 0, securityLevel: 1 },
                    { privateKey: 'key3', purpose: 3, securityLevel: 1 }
                ]
            }
        }
        vi.mocked(invoke).mockResolvedValue(mockKeystore)
        const keys = await getPrivateKeys('id1')
        expect(keys.length).toBe(2)
        expect(keys[0]!.privateKey).toBe('key0')
    })
    it('should return null if identity has no keys', async () => {
        vi.mocked(invoke).mockResolvedValue({ identities: {} })
        const key = await getKeyByPurpose('id1', 0)
        expect(key).toBeNull()
    })
    it('should find key by purpose and security level', async () => {
        const mockKeys = {
            identities: {
                'id1': [{ privateKey: 'found', purpose: 0, securityLevel: 0 }]
            }
        }
        vi.mocked(invoke).mockResolvedValue(mockKeys)
        const key = await getKeyByPurpose('id1', 0, 0)
        expect(key).toBe('found')
    })
    it('should retrieve transfer key with specific structure', async () => {
        vi.mocked(invoke).mockResolvedValue({
            identities: {
                'id1': [{ privateKey: 'wif', purpose: 3, keyId: 5 }]
            }
        })
        const result = await getTransferKey('id1')
        expect(result).toEqual({ privateKey: 'wif', keyId: 5 })
    })
    it('should throw error on deriveKey as it is deprecated', async () => {
        await expect(deriveKey(0, 0)).rejects.toThrow('deprecated')
    })
    it('should handle invoke errors gracefully', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('Keystore Locked'))
        const keys = await getPrivateKeys('any')
        expect(keys).toEqual([])
    })
})
