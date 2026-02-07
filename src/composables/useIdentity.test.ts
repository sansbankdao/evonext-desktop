// src/composables/useIdentity.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, nextTick } from 'vue'
import { useIdentity } from './useIdentity'
import { useIdentityStore } from '@/stores/identity'
global.fetch = vi.fn()
vi.mock('@/stores/identity', () => ({
    useIdentityStore: vi.fn()
}))
vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({ network: { value: 'testnet' } })
}))
vi.mock('@/composables/usePlatformSdk', () => ({
    usePlatformSdk: () => ({
        getSDK: vi.fn().mockResolvedValue({
            identities: {
                getIdentityByIdentifier: vi.fn().mockResolvedValue({
                    revision: BigInt(5),
                    getPublicKeys: () => [{ purposeNumber: 0, data: 'key_data' }]
                })
            }
        })
    })
}))
describe('useIdentity Composable', () => {
    let mockStore: any
    beforeEach(() => {
        vi.clearAllMocks()
        // Use reactive to ensure computed properties update in tests
        mockStore = reactive({
            isAuthenticated: false,
            identityId: null,
            publicKeys: [],
            displayName: '',
            username: '',
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
    describe('Computed Properties', () => {
        it('should return correct display name', async () => {
            const { displayName } = useIdentity()
            mockStore.identityId = 'id_123'
            await nextTick()
            expect(displayName.value).toBe('id_123')
            mockStore.displayName = 'My Name'
            await nextTick()
            expect(displayName.value).toBe('My Name')
        })
        it('should identify auth public key', async () => {
            const { authPublicKey } = useIdentity()
            mockStore.publicKeys = [
                { purpose: 0, data: 'auth' },
                { purpose: 1, data: 'transfer' }
            ]
            await nextTick()
            expect(authPublicKey.value?.data).toBe('auth')
        })
    })
    describe('Actions', () => {
        it('should handle logout', async () => {
            const { logout } = useIdentity()
            await logout()
            expect(mockStore.clearStorage).toHaveBeenCalled()
            expect(mockStore.$reset).toHaveBeenCalled()
        })
        it('should handle successful connection', async () => {
            const { connect } = useIdentity()
            const result = await connect('seed', { discoveredId: 'new_id' })
            expect(result.success).toBe(true)
            expect(mockStore.identityId).toBe('new_id')
        })
    })
})
