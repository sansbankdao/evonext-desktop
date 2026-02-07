// src/composables/useIdentity.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, nextTick } from 'vue'
import { useIdentity } from './useIdentity'
import { useIdentityStore } from '@/stores/identity'
import { ErrorBoundary } from '@/utils/errors'
import { invoke } from '@/utils/tauri'
// Mocking external dependencies
global.fetch = vi.fn()
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
vi.mock('@/stores/identity', () => ({
    useIdentityStore: vi.fn()
}))
vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({
        network: { value: 'testnet' }
    })
}))
vi.mock('@/utils/env', () => ({
    log: vi.fn(),
    getDapiEndpoint: vi.fn().mockReturnValue('https://dapi.mock')
}))
vi.mock('@/stores/identity/utils', () => ({
    hexHash160ToBase64: vi.fn((val) => `b64-${val}`)
}))
vi.mock('@/composables/usePlatformSdk', () => {
    const mockSdk = {
        identities: {
            getIdentityByIdentifier: vi.fn().mockResolvedValue({
                revision: BigInt(5),
                getPublicKeys: () => [
                    {
                        keyType: 'ECDSA',
                        purposeNumber: 0,
                        securityLevelNumber: 0,
                        data: 'key_0_data',
                        readOnly: false
                    },
                    {
                        keyType: 'ECDSA',
                        purposeNumber: 1,
                        securityLevelNumber: 3,
                        data: 'key_1_data',
                        readOnly: true
                    }
                ]
            })
        }
    }
    return {
        usePlatformSdk: () => ({
            getSDK: vi.fn().mockResolvedValue(mockSdk)
        })
    }
})
describe('useIdentity Composable Full Suite', () => {
    let mockStore: any
    beforeEach(() => {
        vi.clearAllMocks()
        // Reactive store mock to support computed properties
        mockStore = reactive({
            isAuthenticated: false,
            identityId: null,
            identityIdx: 0,
            publicKeys: [],
            displayName: '',
            username: '',
            balance: '1000',
            isConnecting: false,
            connectionError: null,
            revision: 0,
            $patch: vi.fn((data) => Object.assign(mockStore, data)),
            $reset: vi.fn(),
            loadFromStorage: vi.fn(),
            saveToStorage: vi.fn(),
            clearStorage: vi.fn(),
            fetchBalance: vi.fn(),
            syncIdentityToBackend: vi.fn()
        })
        vi.mocked(useIdentityStore).mockReturnValue(mockStore)
    })
    describe('State and Computed', () => {
        it('should reflect connection status based on auth and id', async () => {
            const { isConnected } = useIdentity()
            expect(isConnected.value).toBe(false)
            mockStore.isAuthenticated = true
            mockStore.identityId = 'id123'
            await nextTick()
            expect(isConnected.value).toBe(true)
        })
        it('should compute display name with fallback hierarchy', async () => {
            const { displayName } = useIdentity()
            mockStore.identityId = 'ID_ONLY'
            await nextTick()
            expect(displayName.value).toBe('ID_ONLY')
            mockStore.username = 'alice.dash'
            await nextTick()
            expect(displayName.value).toBe('alice.dash')
            mockStore.displayName = 'Alice'
            await nextTick()
            expect(displayName.value).toBe('Alice')
        })
        it('should identify presence of transfer keys', async () => {
            const { hasTransferKey } = useIdentity()
            expect(hasTransferKey.value).toBe(false)
            mockStore.publicKeys = [{ purpose: 1, data: '...' }]
            await nextTick()
            expect(hasTransferKey.value).toBe(true)
        })
    })
    describe('Identity Discovery & DPNS', () => {
        it('getDpnsUsername should handle various DAPI response formats', async () => {
            const { getDpnsUsername } = useIdentity()
            // Scenario 1: Raw String return
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => 'alice.dash'
            } as any)
            let res = await getDpnsUsername('id1')
            expect(res.data).toBe('alice.dash')
            // Scenario 2: result.data nested return
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true, data: 'bob.dash' })
            } as any)
            res = await getDpnsUsername('id2')
            expect(res.data).toBe('bob.dash')
            // Scenario 3: failure
            vi.mocked(global.fetch).mockResolvedValueOnce({
                ok: false,
                status: 500
            } as any)
            res = await getDpnsUsername('id3')
            expect(res.success).toBe(false)
        })
        it('queryIdentityDetails should transform SDK keys and update store', async () => {
            const { queryIdentityDetails } = useIdentity()
            const result = await queryIdentityDetails('id123', 5)
            expect(result.success).toBe(true)
            expect(mockStore.revision).toBe(5)
            expect(mockStore.publicKeys.length).toBe(2)
            expect(mockStore.publicKeys[0].purpose).toBe(0)
            expect(mockStore.publicKeys[1].readOnly).toBe(true)
            expect(mockStore.publicKeys[0].dataB64).toContain('b64-')
        })
        it('discoverIdentities should return empty array on failure', async () => {
            const { discoverIdentities } = useIdentity()
            mockStore.identityId = null
            const results = await discoverIdentities()
            expect(results).toEqual([])
        })
    })
    describe('Lifecycle Actions', () => {
        it('init should refresh if already authenticated', async () => {
            const { init } = useIdentity()
            mockStore.isAuthenticated = true
            mockStore.identityId = 'id123'
            await init()
            expect(mockStore.loadFromStorage).toHaveBeenCalled()
            expect(mockStore.fetchBalance).toHaveBeenCalled()
        })
        it('connect should handle missing ID error', async () => {
            const { connect } = useIdentity()
            const result = await connect('key', { discoveredId: '' })
            expect(result.success).toBe(false)
            expect(result.error).toBe('Identity ID required')
            expect(mockStore.isAuthenticated).toBe(false)
        })
        it('logout should clear local and store state', async () => {
            const { logout } = useIdentity()
            await logout()
            expect(mockStore.clearStorage).toHaveBeenCalled()
            expect(mockStore.$reset).toHaveBeenCalled()
        })
        it('refreshIdentity should sync with backend', async () => {
            const { refreshIdentity } = useIdentity()
            mockStore.identityId = 'id123'
            await refreshIdentity()
            expect(mockStore.syncIdentityToBackend).toHaveBeenCalledWith('testnet')
        })
    })
    describe('Utility Invokes', () => {
        it('getIdentityIdx should return 0 on invoke failure', async () => {
            const { getIdentityIdx } = useIdentity()
            vi.mocked(invoke).mockRejectedValue(new Error('Backend down'))
            const idx = await getIdentityIdx()
            expect(idx).toBe(0)
        })
        it('getIdentityIdx should return value from backend', async () => {
            const { getIdentityIdx } = useIdentity()
            vi.mocked(invoke).mockResolvedValue({ identityIdx: 42 })
            const idx = await getIdentityIdx()
            expect(idx).toBe(42)
        })
    })
})
