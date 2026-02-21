// src/stores/identity/actions/keys.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '@/stores/identity'
import { invoke } from '@tauri-apps/api/core'

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
}))

vi.mock('@/utils/errors', () => ({
    ErrorBoundary: {
        wrap: vi.fn(async (fn: () => Promise<any>, _errorCode: string) => {
            try {
                const result = await fn()
                return { success: true, data: result }
            } catch (e: any) {
                return { success: false, error: { message: e.message, code: _errorCode } }
            }
        })
    }
}))

vi.mock('./get_key', () => ({
    getTransferKey: vi.fn()
}))

describe('Identity Store - Key Actions', () => {
    let store: ReturnType<typeof useIdentityStore>

    const mockIdentityId = 'identity_123'
    const mockKeyId = 0
    const mockPrivateKey = 'abcdef1234567890'
    const mockNetwork = 'testnet'

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useIdentityStore()
        vi.clearAllMocks()
    })

    describe('importPrivateKey', () => {
        it('method exists', () => {
            expect(store.importPrivateKey).toBeDefined()
        })

        it('should import private key successfully', async () => {
            vi.mocked(invoke).mockResolvedValue(true)

            const result = await store.importPrivateKey(
                mockIdentityId,
                mockKeyId,
                mockPrivateKey,
                mockNetwork
            )

            expect(result).toBe(true)
            expect(invoke).toHaveBeenCalledWith('save_imported_key', {
                identityId: mockIdentityId,
                keyId: mockKeyId,
                privateKeyHex: mockPrivateKey,
                network: mockNetwork
            })
        })

        it('should return false when import fails', async () => {
            vi.mocked(invoke).mockResolvedValue(false)

            const result = await store.importPrivateKey(
                mockIdentityId,
                mockKeyId,
                mockPrivateKey,
                mockNetwork
            )

            expect(result).toBe(false)
        })

        it('should handle invoke errors', async () => {
            vi.mocked(invoke).mockRejectedValue(new Error('Network error'))

            const result = await store.importPrivateKey(
                mockIdentityId,
                mockKeyId,
                mockPrivateKey,
                mockNetwork
            )

            expect(result).toBe(false)
        })

        it('should log import operation', async () => {
            const consoleSpy = vi.spyOn(console, 'log')
            vi.mocked(invoke).mockResolvedValue(true)

            await store.importPrivateKey(mockIdentityId, mockKeyId, mockPrivateKey, mockNetwork)

            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('Importing Key ID')
            )

            consoleSpy.mockRestore()
        })

        it('should handle different key IDs', async () => {
            vi.mocked(invoke).mockResolvedValue(true)

            for (const keyId of [0, 1, 2, 10]) {
                const result = await store.importPrivateKey(
                    mockIdentityId,
                    keyId,
                    mockPrivateKey,
                    mockNetwork
                )
                expect(result).toBe(true)
            }
        })

        it('should handle different networks', async () => {
            vi.mocked(invoke).mockResolvedValue(true)

            for (const network of ['testnet', 'mainnet']) {
                const result = await store.importPrivateKey(
                    mockIdentityId,
                    mockKeyId,
                    mockPrivateKey,
                    network
                )
                expect(result).toBe(true)
            }
        })

        it('should handle empty private key', async () => {
            vi.mocked(invoke).mockResolvedValue(false)

            const result = await store.importPrivateKey(
                mockIdentityId,
                mockKeyId,
                '',
                mockNetwork
            )

            expect(result).toBe(false)
        })

        it('should handle long private keys', async () => {
            vi.mocked(invoke).mockResolvedValue(true)
            const longKey = 'a'.repeat(256)

            const result = await store.importPrivateKey(
                mockIdentityId,
                mockKeyId,
                longKey,
                mockNetwork
            )

            expect(result).toBe(true)
        })
    })

    describe('getTransferKey', () => {
        it('should be exported', async () => {
            const { getTransferKey } = await import('./get_key')
            expect(getTransferKey).toBeDefined()
        })
    })
})
