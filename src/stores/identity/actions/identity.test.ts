// src/stores/identity/actions/identity.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '../index'
import { commands } from '@/bindings'
import { normalizeResult } from './identity'

vi.mock('@/bindings', () => ({
    commands: {
        saveIdentity: vi.fn(),
        saveKeys: vi.fn(),
        loadKeystore: vi.fn(),
        deleteIdentity: vi.fn()
    }
}))

vi.mock('@/composables/useIdentity', () => ({
    useIdentity: () => ({
        searchUserIdentities: vi.fn().mockResolvedValue([]),
        queryIdentityDetails: vi.fn().mockResolvedValue({ success: true, data: {} })
    })
}))

vi.mock('@/services/identity/discovery/DAPIService', () => ({
    DAPIService: {
        getIdentityById: vi.fn().mockResolvedValue({ success: true, data: { publicKeys: [] } })
    }
}))

describe('Identity Store - Persistence & Normalization', () => {
    let store: any

    beforeEach(() => {
        setActivePinia(createPinia())
        store = useIdentityStore()
        store.keystore = { identities: {} }
        store.identities = {}
        vi.clearAllMocks()
    })

    describe('normalizeResult', () => {
        it('should normalize success response with data field', () => {
            const result = normalizeResult({ success: true, data: { id: 1 }, error: null })
            expect(result.success).toBe(true)
            expect(result.data).toEqual({ id: 1 })
            expect(result.error).toBeNull()
        })

        it('should normalize success response with payload field', () => {
            const result = normalizeResult({ success: true, payload: { id: 2 } })
            expect(result.success).toBe(true)
            expect(result.data).toEqual({ id: 2 })
        })

        it('should normalize raw object response', () => {
            const result = normalizeResult({ status: 'success', foo: 'bar' })
            expect(result.success).toBe(true)
            expect(result.data).toEqual({ status: 'success', foo: 'bar' })
        })

        it('should normalize error response with string error', () => {
            const result = normalizeResult({ success: false, error: 'Something failed' })
            expect(result.success).toBe(false)
            expect(result.error?.message).toBe('Something failed')
        })

        it('should normalize error response with object error', () => {
            const result = normalizeResult({ success: false, error: { message: 'Nested error' } })
            expect(result.success).toBe(false)
            expect(result.error?.message).toBe('Nested error')
        })

        it('should normalize error response with message field', () => {
            const result = normalizeResult({ success: false, message: 'Error message' })
            expect(result.success).toBe(false)
            expect(result.error?.message).toBe('Error message')
        })

        it('should handle unknown error format', () => {
            const result = normalizeResult(null)
            expect(result.success).toBe(false)
            expect(result.error?.message).toBe('Unknown error')
        })

        it('should handle status: ok as success', () => {
            const result = normalizeResult({ status: 'ok', data: 'test' })
            expect(result.success).toBe(true)
        })
    })

    describe('loadKeystore', () => {
        it('should update store keystore on success', async () => {
            const mockKeystoreData = { identities: { 'id_1': [] } }
            vi.mocked(commands.loadKeystore).mockResolvedValue({
                success: true,
                data: mockKeystoreData,
                error: null
            } as any)

            const result = await store.loadKeystore('testnet')

            expect(result.success).toBe(true)
            expect(store.keystore).toEqual(mockKeystoreData)
        })

        it('should return error object on failed keystore load', async () => {
            vi.mocked(commands.loadKeystore).mockResolvedValue({
                success: false,
                data: null,
                error: 'Disk locked'
            } as any)

            const result = await store.loadKeystore('testnet')

            expect(result.success).toBe(false)
            expect(result.error.message).toContain('Disk locked')
        })

        it('should not update keystore on failure', async () => {
            const originalKeystore = { identities: {} }
            store.keystore = originalKeystore

            vi.mocked(commands.loadKeystore).mockResolvedValue({
                success: false,
                data: null,
                error: 'Failed'
            } as any)

            await store.loadKeystore('testnet')

            expect(store.keystore).toEqual(originalKeystore)
        })
    })

    describe('saveIdentity', () => {
        it('should save identity and update store', async () => {
            vi.mocked(commands.saveIdentity).mockResolvedValue({
                success: true,
                data: null,
                error: null
            } as any)

            const result = await store.saveIdentity('testnet', {
                identityId: 'test_id',
                username: 'testuser',
                balance: '1000',
                revision: 1,
                publicKeys: []
            })

            expect(result.success).toBe(true)
            expect(store.identities['test_id']).toBeDefined()
        })

        it('should apply defaults for missing fields', async () => {
            vi.mocked(commands.saveIdentity).mockResolvedValue({
                success: true,
                data: null,
                error: null
            } as any)

            await store.saveIdentity('testnet', {
                identityId: 'test_id'
            })

            expect(store.identities['test_id'].username).toBe('')
            expect(store.identities['test_id'].balance).toBe('0')
        })
    })

    describe('saveKeys', () => {
        it('should save keys successfully', async () => {
            vi.mocked(commands.saveKeys).mockResolvedValue({
                success: true,
                data: true,
                error: null
            } as any)

            const result = await store.saveKeys('testnet', 'identity_123', [
                { keyId: 0, purpose: 0, securityLevel: 0, keyType: 'ECDSA', privateKey: 'x', publicKey: 'y', createdAt: '', lastUsed: '' }
            ])

            expect(result.success).toBe(true)
        })
    })

    describe('switchIdentity', () => {
        it('should switch to different identity', async () => {
            store.identities = {
                'id_1': { identityId: 'id_1', username: 'user1', balance: '100' },
                'id_2': { identityId: 'id_2', username: 'user2', balance: '200' }
            }
            store.identityId = 'id_1'

            await store.switchIdentity('id_2')

            expect(store.identityId).toBe('id_2')
        })

        it('should do nothing if same identity', async () => {
            store.identities = { 'id_1': { identityId: 'id_1' } }
            store.identityId = 'id_1'

            await store.switchIdentity('id_1')

            // Should not throw or change state
            expect(store.identityId).toBe('id_1')
        })

        it('should throw if identity not found', async () => {
            store.identities = {}

            await expect(store.switchIdentity('unknown')).rejects.toThrow('Identity not found')
        })
    })

    describe('deleteIdentity', () => {
        it('should delete identity from store', async () => {
            store.identities = {
                'id_1': { identityId: 'id_1' },
                'id_2': { identityId: 'id_2' }
            }

            await store.deleteIdentity('id_1')

            expect(store.identities['id_1']).toBeUndefined()
            expect(store.identities['id_2']).toBeDefined()
        })

        it('should clear active identity if deleted', async () => {
            store.identities = { 'id_1': { identityId: 'id_1' } }
            store.identityId = 'id_1'
            store.isConnected = true
            store.isAuthenticated = true

            await store.deleteIdentity('id_1')

            expect(store.identityId).toBeNull()
            expect(store.isConnected).toBe(false)
            expect(store.isAuthenticated).toBe(false)
        })
    })

    describe('updateIdentityMetadata', () => {
        it('should update identity metadata', async () => {
            store.identities = {
                'id_1': { identityId: 'id_1', username: 'old', displayName: 'Old Name' }
            }
            store.identityId = 'id_1'

            await store.updateIdentityMetadata('id_1', {
                username: 'newuser',
                displayName: 'New Name'
            })

            expect(store.identities['id_1'].username).toBe('newuser')
            expect(store.identities['id_1'].displayName).toBe('New Name')
            expect(store.username).toBe('newuser')
            expect(store.displayName).toBe('New Name')
        })
    })

    describe('refreshIdentity', () => {
        it('should refresh identity details', async () => {
            store.identityId = 'id_1'
            store.identities = {
                'id_1': { identityId: 'id_1', balance: '0', revision: 0 }
            }

            // Mock the queryIdentityDetails response
            const mockUseIdentity = vi.mocked(await import('@/composables/useIdentity'))
            mockUseIdentity.useIdentity = vi.fn().mockReturnValue({
                queryIdentityDetails: vi.fn().mockResolvedValue({
                    success: true,
                    data: {
                        balance: '5000',
                        revision: 5,
                        publicKeys: [],
                        username: 'updated'
                    }
                })
            }) as any

            await store.refreshIdentity()
        })
    })
})
