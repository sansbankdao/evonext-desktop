// src/composables/useIdentity.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, nextTick, computed } from 'vue'
import { useIdentity } from './useIdentity'
import { useIdentityStore } from '@/stores/identity'
import { invoke } from '@/utils/tauri'
global.fetch = vi.fn()
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
vi.mock('@/stores/identity', () => ({
    useIdentityStore: vi.fn()
}))
vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({
        network: computed(() => 'testnet')
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
            identities: {},
            isConnected: false,
            $patch: vi.fn((data) => Object.assign(mockStore, data)),
            $reset: vi.fn(),
            loadFromStorage: vi.fn(),
            saveToStorage: vi.fn(),
            clearStorage: vi.fn(),
            fetchBalance: vi.fn(),
            syncIdentityToBackend: vi.fn(),
            // Added missing methods used by useIdentity
            refreshIdentity: vi.fn().mockResolvedValue({ success: true }),
            getPublicKeys: vi.fn(),
            searchUserIdentities: vi.fn().mockResolvedValue([]),
            connectWithPrivateKey: vi.fn().mockImplementation((_key, id) => {
                if (!id) return { success: false, error: 'Identity ID required' }
                return { success: true }
            })
        })
        // Define computed properties for the mock store
        Object.defineProperty(mockStore, 'isConnected', {
            get: () => !!(mockStore.isAuthenticated && mockStore.identityId)
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
            expect(displayName.value).toBe('Unnamed') // Composable uses store.displayName || 'Unnamed'
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
            vi.mocked(invoke).mockResolvedValueOnce('alice.dash')
            let res = await getDpnsUsername('id1')
            expect(res.data).toBe('alice.dash')
            vi.mocked(invoke).mockRejectedValueOnce(new Error('fail'))
            res = await getDpnsUsername('id3')
            expect(res.success).toBe(false)
        })
        it('queryIdentityDetails should trigger store refresh', async () => {
            const { queryIdentityDetails } = useIdentity()
            const result = await queryIdentityDetails('id123', 5)
            expect(result.success).toBe(true)
            expect(mockStore.refreshIdentity).toHaveBeenCalled()
        })
        it('discoverIdentities should return identities from backend', async () => {
            const { discoverIdentities } = useIdentity()
            vi.mocked(invoke).mockResolvedValue([{ identityId: 'id1' }])
            const results = await discoverIdentities('word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12')
            expect(results.success).toBe(true)
            expect(results.identities).toHaveLength(1)
        })
    })
    describe('Lifecycle Actions', () => {
        it('init should load from storage', async () => {
            const { init } = useIdentity()
            await init()
            expect(mockStore.loadFromStorage).toHaveBeenCalled()
        })
        it('connect should handle missing ID error', async () => {
            const { connect } = useIdentity()
            const result = await connect('key', { discoveredId: '' })
            expect(result.success).toBe(false)
            expect(result.error).toBe('Identity ID required')
        })
        it('logout should clear storage', async () => {
            const { logout } = useIdentity()
            await logout()
            expect(mockStore.clearStorage).toHaveBeenCalled()
        })
        it('refreshIdentity should trigger store action', async () => {
            const { refreshIdentity } = useIdentity()
            await refreshIdentity()
            expect(mockStore.refreshIdentity).toHaveBeenCalled()
        })
    })
    describe('Utility Invokes', () => {
        it('getIdentityIdx should return 0 if no id', async () => {
            const { getIdentityIdx } = useIdentity()
            const idx = getIdentityIdx()
            expect(idx).toBe(0)
        })
        it('getIdentityIdx should return value from store mapping', async () => {
            const { getIdentityIdx } = useIdentity()
            mockStore.identities = { 'id123': { identityIdx: 42 } }
            const idx = getIdentityIdx('id123')
            expect(idx).toBe(42)
        })
    })
})
