// src/stores/identity/actions/get_key.test.ts

import { describe, it, expect, vi } from 'vitest'
import { mockIPC } from '@tauri-apps/api/mocks'
import { getTransferKey } from './get_key'

describe('getTransferKey logic', () => {

    it('successfully selects the highest security level Transfer key (Purpose 3)', async () => {
        // 1. Setup Mock Data
        const mockKeystore = {
            identities: {
                "user_123": [
                    { keyId: 0, purpose: 2, securityLevel: 1, privateKey: 'key_master' }, // Not Purpose 3
                    { keyId: 1, purpose: 3, securityLevel: 1, privateKey: 'key_low_sec' }, // Purpose 3, Low Sec
                    { keyId: 2, purpose: 3, securityLevel: 2, privateKey: 'key_high_sec' } // Purpose 3, High Sec (Best)
                ]
            }
        }

        // 2. Intercept the Tauri Invoke
        mockIPC((cmd, args) => {
            if (cmd === 'load_private_keys') {
                expect(args.network).toBe('mainnet')
                return mockKeystore
            }
        })

        // 3. Execute
        const result = await getTransferKey('user_123', 'mainnet')

        // 4. Assert selection logic
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

    it('throws or handles invalid network explicitly', async () => {
        // The implementation logs an error and returns null for invalid network
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
})
