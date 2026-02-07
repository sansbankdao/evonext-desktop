// src/composables/useIdentityDiscovery.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useIdentityDiscovery } from './useIdentityDiscovery'
vi.mock('./useNetwork', () => ({
    useNetwork: () => ({
        ensure: vi.fn().mockResolvedValue('testnet')
    })
}))
vi.mock('@/utils/env', () => ({
    log: vi.fn(),
    getDapiEndpoint: () => 'https://mock-api.dev'
}))
describe('useIdentityDiscovery Composable', () => {
    const discovery = useIdentityDiscovery()
    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal('fetch', vi.fn())
    })
    describe('Key Detection & Utils', () => {
        it('detectKeyType should identify WIF and HEX', () => {
            // A valid WIF is usually 51-52 characters long
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
                dataB64: 'SGVsbG8=' // "Hello"
            }]
            const mapped = discovery.mapPublicKeys(rawKeys)
            expect(mapped[0].type).toBe(0)
            expect(mapped[0].dataBytes).toBe('48656c6c6f') // "Hello" in hex
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
                expect(result.data[0].identityId).toBe('id_0')
            }
        })
    })
})
