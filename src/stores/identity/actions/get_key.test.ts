// src/stores/identity/actions/get_key.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockIPC } from '@tauri-apps/api/mocks'
import { getTransferKey } from './get_key'

describe('getTransferKey logic', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('successfully selects the highest security level Transfer key (Purpose 3)', async () => {
        const mockKeystore = {
            identities: {
                "user_123": [
                    { keyId: 0, purpose: 2, securityLevel: 1, privateKey: 'key_master' },
                    { keyId: 1, purpose: 3, securityLevel: 1, privateKey: 'key_low_sec' },
                    { keyId: 2, purpose: 3, securityLevel: 2, privateKey: 'key_high_sec' }
                ]
            }
        }

        mockIPC((cmd, args) => {
            if (cmd === 'load_private_keys') {
                expect(args.network).toBe('mainnet')
                return mockKeystore
            }
        })

        const result = await getTransferKey('user_123', 'mainnet')
        expect(result).toBe('key_high_sec')
    })

    it('returns null if the identity is not in the keystore', async () => {
        mockIPC((cmd) => {
            if (cmd === 'load_private_keys') {
                return { identities: { "someone_else": [] } }
            }
        })

        const result = await getTransferKey('user_123', 'mainnet')
        expect(result).toBeNull()
    })

    it('returns null if no Transfer keys (Purpose 3) exist for the identity', async () => {
        mockIPC((cmd) => {
            if (cmd === 'load_private_keys') {
                return {
                    identities: {
                        "user_123": [{ keyId: 0, purpose: 2, securityLevel: 1, privateKey: 'id_key' }]
                    }
                }
            }
        })

        const result = await getTransferKey('user_123', 'mainnet')
        expect(result).toBeNull()
    })

    it('returns null and handles invalid network explicitly', async () => {
        const result = await getTransferKey('user_123', 'invalid-net')
        expect(result).toBeNull()
    })

    it('handles empty or missing keystore files gracefully', async () => {
        mockIPC((cmd) => {
            if (cmd === 'load_private_keys') return null
        })

        const result = await getTransferKey('user_123', 'mainnet')
        expect(result).toBeNull()
    })

    // NEW: Achieve 100% coverage by testing the catch/error branch
    it('returns null if the Tauri command throws an error', async () => {
        mockIPC((cmd) => {
            if (cmd === 'load_private_keys') {
                throw new Error('IPC_FAILED')
            }
        })

        const result = await getTransferKey('user_123', 'mainnet')
        expect(result).toBeNull()
    })
})
