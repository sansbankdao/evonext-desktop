// src/stores/identity/actions/connection.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '@/stores/identity'
import { invoke } from '@tauri-apps/api/core'
import { commands } from '@/bindings'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'

vi.mock('@tauri-apps/api/core', () => ({
    invoke: vi.fn()
}))

vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))

vi.mock('@/bindings', () => ({
    commands: {
        saveIdentity: vi.fn(),
        saveKeys: vi.fn(),
        loadKeystore: vi.fn(),
        getIdentityInfo: vi.fn()
    }
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

// Import the mocked version of @/utils/tauri invoke
import { invoke as tauriInvoke } from '@/utils/tauri'

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

        // Mock the @/utils/tauri invoke (used by connection.ts)
        vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'get_identity_info') {
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
            if (cmd === 'save_identity_store') {
                return { success: true }
            }
            if (cmd === 'load_identity_store') {
                return { identityId: mockIdentityId, identities: {} }
            }
            if (cmd === 'clear_identity_store') {
                return { success: true }
            }
            return { success: true }
        })

        // Also mock @tauri-apps/api/core invoke for any code that uses it directly
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'get_identity_info') {
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
            if (cmd === 'save_identity_store') {
                return { success: true }
            }
            if (cmd === 'load_identity_store') {
                return { identityId: mockIdentityId, identities: {} }
            }
            if (cmd === 'clear_identity_store') {
                return { success: true }
            }
            return { success: true }
        })

        // Mock commands for saveIdentity and saveKeys
        vi.mocked(commands.saveIdentity).mockResolvedValue({ success: true, data: { identityId: mockIdentityId } } as any)
        vi.mocked(commands.saveKeys).mockResolvedValue({ success: true, data: true, error: null })
        vi.mocked(commands.loadKeystore).mockResolvedValue({ success: true, data: {}, error: null })

        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            privateKey: { WIF: () => 'wif_key' }
        } as any)
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

            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
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
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
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
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
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
            vi.mocked(commands.saveIdentity).mockResolvedValueOnce({
                success: false,
                error: 'Save failed'
            } as any)

            const result = await store.connectWithSeed(
                mockMnemonic,
                mockNetwork,
                mockIdentityId,
                0
            )

            expect(result.success).toBe(false)
            expect(result.error).toBeTruthy()
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
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
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
            expect(result.error).toContain('NETWORK_CRASH')
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
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
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
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
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

            expect(commands.saveKeys).toHaveBeenCalledWith(
                mockNetwork,
                mockIdentityId,
                expect.arrayContaining([
                    expect.objectContaining({
                        identityId: mockIdentityId,
                        keyId: 0
                    })
                ])
            )
        })

        it('should handle missing identity data gracefully', async () => {
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
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
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'get_identity_info') {
                    return {
                        success: true,
                        data: {
                            identityId: mockIdentityId,
                            balance: '1000',
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

        it('should save identity and forward genuine private-key entries', async () => {
            vi.mocked(commands.saveKeys).mockClear()

            // `save_keys` requires `Vec<IPrivateKeyEntry>`; public-key
            // objects are filtered out (see the regression guards below).
            const payload = {
                identityId: mockIdentityId,
                publicKeys: [
                    {
                        identityId: mockIdentityId,
                        keyId: 0,
                        purpose: 0,
                        securityLevel: 0,
                        keyType: 'ECDSA_HASH160',
                        privateKey: 'wif',
                        publicKey: 'hash',
                        createdAt: '2026-09-19T00:00:00Z',
                        lastUsed: '2026-09-19T00:00:00Z'
                    }
                ]
            }

            const result = await store.saveIdentityWithKeys(mockNetwork, payload)

            expect(result.success).toBe(true)
            expect(commands.saveKeys).toHaveBeenCalled()
        })

        it('should override keys when keysOverride provided', async () => {
            const payload = { identityId: mockIdentityId }
            const keysOverride = [{ id: 1, purpose: 1, securityLevel: 1 }]

            await store.saveIdentityWithKeys(mockNetwork, payload, keysOverride)

            expect(commands.saveIdentity).toHaveBeenCalledWith(
                mockNetwork,
                expect.objectContaining({
                    identityId: mockIdentityId,
                    publicKeys: keysOverride
                })
            )
        })

        it('should not save keys if no publicKeys in payload', async () => {
            vi.mocked(commands.saveKeys).mockClear()

            const payload = { identityId: mockIdentityId }

            await store.saveIdentityWithKeys(mockNetwork, payload)

            expect(commands.saveKeys).not.toHaveBeenCalled()
        })

        // ================================================================
        // REGRESSION GUARD (v26.9.14 "Connection failed" class of bug)
        //
        // `saveKeys` forwards its `keys` argument VERBATIM to the Rust
        // command `save_keys`, whose parameter type is
        // `Vec<IPrivateKeyEntry>` (src-tauri/src/models.rs:150-160).
        // Every field is REQUIRED, including `lastUsed`.
        //
        // `transformPublicKeys()` (src/stores/identity/utils.ts:9-33)
        // returns `IPublicKey` objects — `idx, type, keyType, purpose,
        // securityLevel, data, dataBytes, dataB64, readOnly, disabledAt` —
        // which have NO `privateKey`, `identityId`, `keyId`, `createdAt`
        // or `lastUsed`. Forwarding those to `saveKeys` makes Tauri's
        // argument deserialization fail, so the whole connect aborts.
        //
        // These tests pin the contract: only genuine IPrivateKeyEntry
        // objects may ever reach `commands.saveKeys`.
        // ================================================================

        it('must NOT forward public-key objects to saveKeys (they are not IPrivateKeyEntry)', async () => {
            vi.mocked(commands.saveKeys).mockClear()

            // Exact shape produced by `transformPublicKeys()`.
            const publicKeys = [
                {
                    idx: 0,
                    type: 0,
                    keyType: 'ECDSA_HASH160',
                    purpose: 0,
                    securityLevel: 0,
                    data: 'abc123',
                    dataBytes: '',
                    dataB64: '',
                    readOnly: false,
                    disabledAt: null
                }
            ]

            await store.saveIdentityWithKeys(mockNetwork, {
                identityId: mockIdentityId,
                publicKeys
            })

            // If saveKeys IS called, every element must satisfy the Rust
            // IPrivateKeyEntry contract. Public-key objects do not, so the
            // correct behaviour is to not call it at all.
            const calls = vi.mocked(commands.saveKeys).mock.calls
            for (const call of calls) {
                const keysArg = call[2] as any[]
                for (const entry of keysArg) {
                    expect(
                        typeof entry.lastUsed,
                        'saveKeys was called with an entry missing `lastUsed`; ' +
                            'this is the exact v26.9.14 "Connection failed" bug'
                    ).toBe('string')
                    expect(typeof entry.privateKey).toBe('string')
                    expect(typeof entry.identityId).toBe('string')
                    expect(typeof entry.keyId).toBe('number')
                    expect(typeof entry.createdAt).toBe('string')
                }
            }
        })

        it('should forward genuine IPrivateKeyEntry objects to saveKeys', async () => {
            vi.mocked(commands.saveKeys).mockClear()

            const realKeys = [
                {
                    identityId: mockIdentityId,
                    keyId: 0,
                    purpose: 0,
                    securityLevel: 0,
                    keyType: 'ECDSA_HASH160',
                    privateKey: 'cVtXfoMMnUCxHFLQwjVY3RpQmUJoZcpuokyHw2BQq41tzKeLXxAP',
                    publicKey: 'abc123',
                    createdAt: '2026-09-19T00:00:00Z',
                    lastUsed: '2026-09-19T00:00:00Z'
                }
            ]

            await store.saveIdentityWithKeys(
                mockNetwork,
                { identityId: mockIdentityId },
                realKeys
            )

            expect(commands.saveKeys).toHaveBeenCalled()
            const keysArg = vi.mocked(commands.saveKeys).mock.calls[0]?.[2] as any[]
            expect(keysArg).toHaveLength(1)
            expect(keysArg[0]?.lastUsed).toBe('2026-09-19T00:00:00Z')
            expect(keysArg[0]?.privateKey).toBe(
                'cVtXfoMMnUCxHFLQwjVY3RpQmUJoZcpuokyHw2BQq41tzKeLXxAP'
            )
        })
    })

    describe('loadFromStorage', () => {
        it('method exists', () => {
            expect(store.loadFromStorage).toBeDefined()
        })

        it('should load identity from storage', async () => {
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
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
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'load_identity_store') {
                    return null
                }
                return { success: true }
            })

            await store.loadFromStorage()

            expect(store.isConnected).toBe(false)
        })

        it('should handle storage errors gracefully', async () => {
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'load_identity_store') {
                    throw new Error('Storage corrupted')
                }
                return { success: true }
            })

            await store.loadFromStorage()

            expect(store.identityId).toBeNull()
        })

        it('should validate loaded data', async () => {
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
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

            expect(tauriInvoke).toHaveBeenCalledWith('save_identity_store', {
                identityId: mockIdentityId,
                identities: { [mockIdentityId]: createMockIdentity({ identityId: mockIdentityId }) }
            })
        })

        it('should handle save errors gracefully', async () => {
            vi.mocked(tauriInvoke).mockImplementation(async (cmd: string) => {
                if (cmd === 'save_identity_store') {
                    throw new Error('Disk full')
                }
                return { success: true }
            })

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
            expect(tauriInvoke).toHaveBeenCalledWith('clear_identity_store')
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
