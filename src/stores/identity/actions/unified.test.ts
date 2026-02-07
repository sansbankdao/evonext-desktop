// src/stores/identity/actions/unified.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { unifiedActions } from './unified'

const mockInvoke = vi.hoisted(() => vi.fn())
vi.mock('@/utils/tauri', () => ({
    invoke: mockInvoke
}))

describe('unified identity actions', () => {
    let store: any

    beforeEach(() => {
        vi.clearAllMocks()
        // Mocking the Pinia store context
        store = {
            connecting: false,
            error: null,
            isConnected: false,
            activeIdentity: null,
            ...unifiedActions()
        }
    })

    describe('connectFromDiscoveryUnified', () => {
        const discovered = {
            identityId: 'id_123',
            dpnsUsername: 'user.dash',
            balance: '1000'
        }

        it('saves identity and updates store state on success', async () => {
            mockInvoke.mockResolvedValue({ success: true })

            await store.connectFromDiscoveryUnified(discovered, 'testnet')

            expect(mockInvoke).toHaveBeenCalledWith('save_identity_unified', expect.any(Object))
            expect(store.isConnected).toBe(true)
            expect(store.activeIdentity.username).toBe('user.dash')
        })

        it('sets error state if backend save fails', async () => {
            mockInvoke.mockResolvedValue({ success: false, error: 'DB Error' })

            // We catch the error because the implementation throws it
            await expect(
                store.connectFromDiscoveryUnified({ identityId: 'id_1' }, 'testnet')
            ).rejects.toThrow('DB Error')

            expect(store.isConnected).toBe(false)
            expect(store.error).toBe('DB Error')
        })

        it('returns early if already connecting', async () => {
            store.connecting = true
            await store.connectFromDiscoveryUnified(discovered, 'testnet')
            expect(mockInvoke).not.toHaveBeenCalled()
        })
    })

    describe('loadActiveIdentityUnified', () => {
        it('populates store from backend payload', async () => {
            store.activeIdentity = { identityId: 'id_1' }
            mockInvoke.mockResolvedValue({
                success: true,
                payload: { identity_id: 'id_1', username: 'rust_user', balance: '50' }
            })

            await store.loadActiveIdentityUnified('testnet')

            expect(store.activeIdentity.username).toBe('rust_user')
            expect(store.isConnected).toBe(true)
        })
    })
})
