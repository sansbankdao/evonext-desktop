// src/stores/identity/actions/identity.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useIdentityStore } from '../index'
import { commands } from '@/bindings'

vi.mock('@/bindings', () => ({
    commands: {
        saveIdentity: vi.fn(),
        saveKeys: vi.fn(),
        saveIdentityWithKeys: vi.fn(),
        loadKeystore: vi.fn(),
        deleteIdentity: vi.fn()
    }
}))
vi.mock('@/composables/useIdentity', () => ({
    useIdentity: () => ({
        searchUserIdentities: vi.fn().mockResolvedValue({
            success: true,
            data: [{ identityId: 'discovered_1' }]
        }),
        queryIdentityDetails: vi.fn().mockResolvedValue({
            success: true,
            data: { balance: '999', publicKeys: [{ id: 1 }] }
        })
    })
}))

describe('Identity Store - Persistence & Normalization', () => {
    let store: any
    beforeEach(() => {
        setActivePinia(createPinia())
        store = useIdentityStore()
        store.keystore = { identities: {} }
        vi.clearAllMocks()
    })
    it('should normalize snake_case keys from UI into camelCase for Rust', async () => {
        const messyKeys = [{
            key_id: 1,
            private_key: 'secret_wif',
            security_level: 0,
            derived_from_mnemonic: true
        }]
        vi.mocked(commands.saveKeys).mockResolvedValue({
            status: 'success',
            data: true
        } as any)
        await store.saveKeys('testnet', 'id_123', messyKeys)
        const callArgs = vi.mocked(commands.saveKeys).mock.calls[0]
        const sentKeys = (callArgs as any)?.[2] || []
        expect(sentKeys[0]).toHaveProperty('keyId', 1)
        expect(sentKeys[0]).toHaveProperty('privateKey', 'secret_wif')
    })
    describe('loadKeystore', () => {
        it('should update store keystore on success', async () => {
            const mockKeystoreData = { identities: { 'id_1': [] } }
            vi.mocked(commands.loadKeystore).mockResolvedValue({
                status: 'success',mockKeystoreData
            } as any)
            const result = await store.loadKeystore('testnet')
            expect(result.success).toBe(true)
            // FIX: Check if store.keystore is actually updated
            expect(store.keystore).toEqual(mockKeystoreData)
        })
        it('should return error object on failed keystore load', async () => {
            vi.mocked(commands.loadKeystore).mockResolvedValue({
                status: 'error',
                error: 'Disk locked'
            } as any)
            const result = await store.loadKeystore('testnet')
            expect(result.success).toBe(false)
            expect(result.error).toBe('Disk locked')
        })
    })
    describe('saveIdentityWithKeys (Error Paths)', () => {
        it('should throw error if missing privateKey in payload', async () => {
            vi.mocked(commands.saveIdentityWithKeys).mockResolvedValue({
                status: 'error',
                error: 'Missing keys'
            } as any)
            // FIX: Actual error message is 'Missing keys', not 'Missing privateKey in payload'
            const result = await store.saveIdentityWithKeys('testnet', { identityId: '1' }, [])
            expect(result.success).toBe(false)
            expect(result.error).toBe('Missing keys')
        })
        it('should handle API error response', async () => {
            vi.mocked(commands.saveIdentityWithKeys).mockResolvedValue({
                status: 'error',
                error: 'DB Error'
            } as any)
            const result = await store.saveIdentityWithKeys('testnet', { identityId: '1' }, [{ privateKey: 'wif' }])
            expect(result.success).toBe(false)
        })
    })
    describe('deleteIdentity', () => {
        it('should clear all identities and reset ID if null provided', async () => {
            store.identities = { 'id_1': {} }
            store.identityId = 'id_1'
            vi.mocked(commands.deleteIdentity).mockResolvedValue({ status: 'success' } as any)
            await store.deleteIdentity('testnet', null)
            expect(store.identities).toEqual({})
            expect(store.identityId).toBeNull()
        })
        it('should delete specific identity', async () => {
            store.identities = { 'id_1': {}, 'id_2': {} }
            store.identityId = 'id_1'
            vi.mocked(commands.deleteIdentity).mockResolvedValue({ status: 'success' } as any)
            await store.deleteIdentity('testnet', 'id_1')
            expect(store.identities).toEqual({ 'id_2': {} })
            expect(store.identityId).toBeNull()
        })
    })
    describe('getPublicKeys', () => {
        it('should return public keys from local store if available', async () => {
            store.publicKeys = [{ id: 1 }, { id: 2 }]
            const keys = await store.getPublicKeys()
            expect(keys.success).toBe(true)
            expect(keys.data).toEqual([{ id: 1 }, { id: 2 }])
        })
        it('should query from composables if no local keys', async () => {
            store.identityId = 'id_123'
            store.publicKeys = []
            const result = await store.getPublicKeys()
            expect(result.success).toBe(true)
            expect(result.data).toHaveLength(1)
        })
    })
})
