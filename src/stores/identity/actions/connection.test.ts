// src/stores/identity/actions/connection.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '@/stores/identity'
import { invoke } from '@tauri-apps/api/core'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
}))

vi.mock('@/services/identity/keyDerivation.service', () => ({
    KeyDerivationService: {
        getPrivateKeyWASM: vi.fn()
    }
}))

const mockPlatformInitialize = vi.fn().mockResolvedValue({})
const mockPlatformReset = vi.fn()

vi.mock('@/composables/usePlatform', () => ({
    usePlatform: () => ({
        initialize: mockPlatformInitialize,
        reset: mockPlatformReset
    })
}))

// Helper to create valid IIdentity
function createMockIdentity(overrides: Partial<any> = {}) {
    return {
        identityId: 'test_id',
        identityIdx: 0,
        balance: '0',
        publicKeys: [],
        revision: 0,
        ...overrides
    }
}

describe('Identity Store - Connection Actions', () => {
    let store: ReturnType<typeof useIdentityStore>
    const mockMnemonic = 'test seed phrase with twelve words here for testing purposes only'
    const mockIdentityId = 'id_123'
    const mockNetwork = 'mainnet' as const
    const mockPrivateKey = 'private_key_hex'

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useIdentityStore()
        vi.clearAllMocks()

        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'get_identity_info' || cmd === 'get_identity_details') {
                return {
                    success: true,
                    data: {
                        identityId: mockIdentityId,
                        balance: '1000',
                        revision: 1,
                        publicKeys: [{
                            purpose: 0,
                            securityLevel: 0,
                            data: 'pub_key',
                            keyType: 'ECDSA_SECP256K1'
                        }]
                    }
                }
            }
            if (cmd === 'save_identity' || cmd === 'save_keys' || cmd === 'save_identity_with_keys') {
                return { success: true, data: null }
            }
            if (cmd === 'load_identity_store') {
                return { identityId: mockIdentityId, identities: {} }
            }
            return { success: true }
        })

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            privateKey: { WIF: () => 'wif_key' }
        } as any)

        store.saveIdentity = vi.fn().mockResolvedValue({ success: true })
        store.saveKeys = vi.fn().mockResolvedValue({ success: true })
        store.refreshIdentity = vi.fn().mockResolvedValue(undefined)
        store.saveToStorage = vi.fn().mockResolvedValue(undefined)
    })

    describe('connectWithSeed', () => {
        it('method exists', () => {
            expect(store.connectWithSeed).toBeDefined()
        })

        it('should successfully connect with seed phrase', async () => {
            const result = await store.connectWithSeed(
                mockMnemonic,
                mockNetwork,
                mockIdentityId,
                0
            )

            expect(result.success).toBe(true)
            expect(result.identityId).toBe(mockIdentityId)
            expect(store.identityId).toBe(mockIdentityId)
            expect(store.isConnected).toBe(true)
            expect(store.isAuthenticated).toBe(true)
        })

        it('should set isConnecting during operation', async () => {
            let connectingDuringCall = false

            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'get_identity_info') {
                    connectingDuringCall = store.isConnecting
                    return {
                        success: true,
                        data: {
                            identityId: mockIdentityId,
                            balance: '1000',
                            publicKeys: []
                        }
                    }
                }
                return { success: true }
            })

            await store.connectWithSeed(mockMnemonic, mockNetwork, mockIdentityId, 0)

            expect(connectingDuringCall).toBe(true)
            expect(store.isConnecting).toBe(false)
        })

        it('should handle failed identity fetch', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'get_identity_info') {
                    return { success: false, error: 'Identity not found' }
                }
                return { success: true }
            })

            const result = await store.connectWithSeed(
                mockMnemonic,
                mockNetwork,
                mockIdentityId,
                0
            )

            expect(result.success).toBe(false)
            expect(result.error).toBeDefined()
        })

        it('should handle network errors', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'get_identity_info') {
                    throw new Error('Network timeout')
                }
                return { success: true }
            })

            const result = await store.connectWithSeed(
                mockMnemonic,
                mockNetwork,
                mockIdentityId,
                0
            )

            expect(result.success).toBe(false)
            expect(result.error).toContain('Network timeout')
            expect(store.connectionError).toContain('Network timeout')
        })

        it('should handle save failure', async () => {
            store.saveIdentity = vi.fn().mockResolvedValue({ success: false, error: { message: 'Save failed' } })

            const result = await store.connectWithSeed(
                mockMnemonic,
                mockNetwork,
                mockIdentityId,
                0
            )

            expect(result.success).toBe(false)
            expect(result.error).toContain('Save failed')
        })

        it('should clear connectionError on start', async () => {
            store.connectionError = 'Previous error'

            await store.connectWithSeed(mockMnemonic, mockNetwork, mockIdentityId, 0)

            expect(store.connectionError).toBeNull()
        })
    })

    describe('connectWithSingleKey', () => {
        it('method exists', () => {
            expect(store.connectWithSingleKey).toBeDefined()
        })

        it('should successfully connect with single key', async () => {
            const result = await store.connectWithSingleKey(
                mockPrivateKey,
                mockIdentityId,
                mockNetwork
            )

            expect(result.success).toBe(true)
            expect(result.identityId).toBe(mockIdentityId)
            expect(store.identityId).toBe(mockIdentityId)
        })

        it('should call connectWithPrivateKey internally', async () => {
            const result = await store.connectWithSingleKey(
                mockPrivateKey,
                mockIdentityId,
                mockNetwork
            )

            expect(result.success).toBe(true)
            expect(store.isConnected).toBe(true)
        })

        it('should return error on DAPI failure', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'get_identity_info') {
                    throw new Error('NETWORK_CRASH')
                }
                return { success: true }
            })

            const result = await store.connectWithSingleKey(
                mockPrivateKey,
                mockIdentityId,
                mockNetwork
            )

            expect(result.success).toBe(false)
            const err = typeof result.error === 'string' ? result.error : (result.error as any)?.message
            expect(err).toContain('NETWORK_CRASH')
        })
    })

    describe('connectWithPrivateKey', () => {
        it('method exists', () => {
            expect(store.connectWithPrivateKey).toBeDefined()
        })

        it('should successfully connect with private key', async () => {
            const result = await store.connectWithPrivateKey(
                mockPrivateKey,
                mockIdentityId,
                mockNetwork
            )

            expect(result.success).toBe(true)
            expect(store.identityId).toBe(mockIdentityId)
            expect(store.isConnected).toBe(true)
            expect(store.isAuthenticated).toBe(true)
        })

        it('should update balance from identity data', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'get_identity_info') {
                    return {
                        success: true,
                        data: {
                            identityId: mockIdentityId,
                            balance: '5000',
                            revision: 2,
                            publicKeys: []
                        }
                    }
                }
                return { success: true }
            })

            await store.connectWithPrivateKey(mockPrivateKey, mockIdentityId, mockNetwork)

            expect(store.balance).toBe('5000')
        })

        it('should update username from dpnsUsername', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'get_identity_info') {
                    return {
                        success: true,
                        data: {
                            identityId: mockIdentityId,
                            balance: '1000',
                            dpnsUsername: 'testuser',
                            publicKeys: []
                        }
                    }
                }
                return { success: true }
            })

            await store.connectWithPrivateKey(mockPrivateKey, mockIdentityId, mockNetwork)

            expect(store.username).toBe('testuser')
            expect(store.displayName).toBe('testuser')
        })

        it('should save keys to keystore', async () => {
            await store.connectWithPrivateKey(mockPrivateKey, mockIdentityId, mockNetwork)

            expect(store.saveKeys).toHaveBeenCalled()
        })

        it('should handle missing identity data gracefully', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'get_identity_info') {
                    return { success: false, error: 'Not found' }
                }
                return { success: true }
            })

            const result = await store.connectWithPrivateKey(
                mockPrivateKey,
                mockIdentityId,
                mockNetwork
            )

            expect(result.success).toBe(false)
        })

        it('should handle missing public keys', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'get_identity_info') {
                    return {
                        success: true,
                        data: {
                            identityId: mockIdentityId,
                            balance: '1000',
                            // no publicKeys field
                        }
                    }
                }
                return { success: true }
            })

            const result = await store.connectWithPrivateKey(
                mockPrivateKey,
                mockIdentityId,
                mockNetwork
            )

            expect(result.success).toBe(true)
            expect(store.publicKeys).toEqual([])
        })
    })

    describe('saveIdentityWithKeys', () => {
        it('method exists', () => {
            expect(store.saveIdentityWithKeys).toBeDefined()
        })

        it('should save identity with keys', async () => {
            const payload = {
                identityId: mockIdentityId,
                publicKeys: [{ id: 0, purpose: 0, securityLevel: 0 }]
            }

            const result = await store.saveIdentityWithKeys(mockNetwork, payload)

            expect(result.success).toBe(true)
            expect(store.saveKeys).toHaveBeenCalled()
        })

        it('should override keys when keysOverride provided', async () => {
            const payload = { identityId: mockIdentityId }
            const keysOverride = [{ id: 1, purpose: 1, securityLevel: 1 }]

            await store.saveIdentityWithKeys(mockNetwork, payload, keysOverride)

            expect(store.saveIdentity).toHaveBeenCalledWith(mockNetwork, {
                ...payload,
                publicKeys: keysOverride
            })
        })

        it('should not save keys if no publicKeys in payload', async () => {
            const payload = { identityId: mockIdentityId }

            await store.saveIdentityWithKeys(mockNetwork, payload)

            expect(store.saveKeys).not.toHaveBeenCalled()
        })
    })

    describe('loadFromStorage', () => {
        it('method exists', () => {
            expect(store.loadFromStorage).toBeDefined()
        })

        it('should load identity from storage', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'load_identity_store') {
                    return {
                        identityId: mockIdentityId,
                        identities: { [mockIdentityId]: createMockIdentity({ identityId: mockIdentityId }) }
                    }
                }
                return { success: true }
            })

            await store.loadFromStorage()

            expect(store.identityId).toBe(mockIdentityId)
            expect(store.isConnected).toBe(true)
        })

        it('should handle empty storage', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'load_identity_store') {
                    return null
                }
                return { success: true }
            })

            await store.loadFromStorage()

            expect(store.isConnected).toBe(false)
        })

        it('should handle storage errors gracefully', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'load_identity_store') {
                    throw new Error('Storage corrupted')
                }
                return { success: true }
            })

            // Should not throw
            await store.loadFromStorage()

            expect(store.identityId).toBeNull()
        })

        it('should validate loaded data', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'load_identity_store') {
                    return { identityId: mockIdentityId, identities: {} }
                }
                return { success: true }
            })

            await store.loadFromStorage()

            expect(store.identityId).toBe(mockIdentityId)
        })
    })

    describe('saveToStorage', () => {
        it('method exists', () => {
            expect(store.saveToStorage).toBeDefined()
        })

        it('should save identity to storage', async () => {
            store.identityId = mockIdentityId
            store.identities = { [mockIdentityId]: createMockIdentity({ identityId: mockIdentityId }) }

            await store.saveToStorage()

            expect(invoke).toHaveBeenCalledWith('save_identity_store', {
                identityId: mockIdentityId,
                identities: { [mockIdentityId]: createMockIdentity({ identityId: mockIdentityId }) }
            })
        })

        it('should handle save errors gracefully', async () => {
            vi.mocked(invoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'save_identity_store') {
                    throw new Error('Disk full')
                }
                return { success: true }
            })

            // Should not throw
            await store.saveToStorage()
        })
    })

    describe('clearStorage', () => {
        it('method exists', () => {
            expect(store.clearStorage).toBeDefined()
        })

        it('should clear all identity data', async () => {
            store.identityId = mockIdentityId
            store.identities = { [mockIdentityId]: createMockIdentity() }
            store.isConnected = true
            store.isAuthenticated = true

            await store.clearStorage()

            expect(store.identityId).toBeNull()
            expect(store.identities).toEqual({})
            expect(store.isConnected).toBe(false)
            expect(store.isAuthenticated).toBe(false)
            expect(invoke).toHaveBeenCalledWith('clear_identity_store')
        })
    })

    describe('clearConnectionError', () => {
        it('method exists', () => {
            expect(store.clearConnectionError).toBeDefined()
        })

        it('should clear connection error', () => {
            store.connectionError = 'Some error'

            store.clearConnectionError()

            expect(store.connectionError).toBeNull()
        })
    })
})
