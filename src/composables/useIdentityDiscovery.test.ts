// src/composables/useIdentityDiscovery.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityDiscovery } from './useIdentityDiscovery'

// Mock dependencies
vi.mock('./useNetwork', () => ({
    useNetwork: () => ({
        ensure: vi.fn().mockResolvedValue('testnet')
    })
}))

vi.mock('@/utils/env', () => ({
    log: vi.fn(),
    getDapiEndpoint: () => 'https://mock-api.dev'
}))

// Mock the identity store to prevent runtime errors during initialization
vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({
        network: 'testnet',
        connectionError: null,
        identityId: null,
        identity: null,
        balance: '0',
        publicKeys: [],
        revision: 0,
        username: null,
        displayName: null,
        premiumAccess: false,
        isConnecting: false,
        isAuthenticated: false,
        isConnected: false,
        lastConnected: null,
        saveKeys: vi.fn().mockResolvedValue(undefined),
        saveIdentityDataToStore: vi.fn().mockResolvedValue(undefined),
        saveMnemonicToStore: vi.fn().mockResolvedValue(undefined),
        getCurrentNetwork: vi.fn().mockResolvedValue('testnet'),
        loadSettings: vi.fn().mockResolvedValue(undefined),
        logout: vi.fn().mockResolvedValue(undefined),
        resetStoreState: vi.fn()
    })
}))
describe('useIdentityDiscovery Composable', () => {
    let discovery: ReturnType<typeof useIdentityDiscovery>
    beforeEach(() => {
        // Ensure Pinia is active for each test
        setActivePinia(createPinia())
        vi.clearAllMocks()
        vi.stubGlobal('fetch', vi.fn())
        discovery = useIdentityDiscovery()
    })
    describe('Key Detection & Utils', () => {
        it('detectKeyType should identify WIF and HEX', () => {
            const mockWif = 'cTog' + 'a'.repeat(48)
            expect(discovery.detectKeyType(mockWif)).toBe('WIF')
            expect(discovery.detectKeyType('a'.repeat(64))).toBe('HEX')
            expect(discovery.detectKeyType('short')).toBe('UNKNOWN')
        })
        it('mapPublicKeys should correctly transform raw key objects', () => {
            const rawKeys = [{
                keyType: 'ECDSA_SECP256K1',
                purpose: 0,
                securityLevel: 0,
                dataB64: 'SGVsbG8='
            }]
            const mapped = discovery.mapPublicKeys(rawKeys)
            expect(mapped[0]!.type).toBe(0)
            expect(mapped[0]!.dataBytes).toBe('48656c6c6f')
        })
    })
    describe('API Interaction', () => {
        it('queryWebAPI should perform a POST request and return json', async () => {
            const mockRes = { success: true, data: { result: 'ok' } }
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => mockRes
            } as Response)
            const result = await discovery.queryWebAPI('test_method', [1, 2])
            expect(fetch).toHaveBeenCalledWith(
                'https://mock-api.dev',
                expect.objectContaining({ method: 'POST' })
            )
            expect(result.success).toBe(true)
            if (result.success) expect(result.data.result).toBe('ok')
        })
        it('getIdentityById should return mapped identity on success', async () => {
            const mockApiReturn = {
                success: true,
                data: {
                    success: true,
                    result: {
                        identityId: 'id_123',
                        balance: '500',
                        publicKeys: []
                    }
                }
            }
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => mockApiReturn
            } as Response)
            const result = await discovery.getIdentityById('id_123')
            expect(result.success).toBe(true)
            if (result.success && result.data) {
                expect(result.data.identityId).toBe('id_123')
                expect(result.data.balance).toBe('500')
            }
        })
    })
    describe('Seed Discovery', () => {
        it('getIdentitiesFromSeed should return identities array', async () => {
            const mockApiReturn = {
                success: true,
                data: {
                    success: true,
                    result: [{ identityId: 'id_0', index: 0 }]
                }
            }
            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => mockApiReturn
            } as Response)
            const result = await discovery.getIdentitiesFromSeed('mock seed phrase')
            expect(result.success).toBe(true)
            if (result.success && result.data) {
                expect(result.data).toHaveLength(1)
                expect(result.data[0]!.identityId).toBe('id_0')
            }
        })
    })
})
