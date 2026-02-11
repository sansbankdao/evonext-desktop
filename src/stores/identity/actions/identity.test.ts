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

describe('Identity Store - Persistence & Normalization', () => {
    let store: any
    beforeEach(() => {
        setActivePinia(createPinia())
        store = useIdentityStore()
        store.keystore = { identities: {} }
        vi.clearAllMocks()
    })
    describe('loadKeystore', () => {
        it('should update store keystore on success', async () => {
            const mockKeystoreData = { identities: { 'id_1': [] } }
            vi.mocked(commands.loadKeystore).mockResolvedValue({
                status: 'success',mockKeystoreData
            } as any)
            const result = await store.loadKeystore('testnet')
            expect(result.success).toBe(true)
            expect(store.keystore).toEqual(mockKeystoreData)
        })
        it('should return error object on failed keystore load', async () => {
            vi.mocked(commands.loadKeystore).mockResolvedValue({
                status: 'error',
                error: 'Disk locked'
            } as any)
            const result = await store.loadKeystore('testnet')
            expect(result.success).toBe(false)
            // Use 'as any' to resolve TS(2339)
            expect((result.error as any).message).toContain('Disk locked')
        })
    })
    describe('saveIdentityWithKeys (Error Paths)', () => {
        it('should handle API error response', async () => {
            vi.mocked(commands.saveIdentityWithKeys).mockResolvedValue({
                status: 'error',
                error: 'DB Error'
            } as any)
            const result = await store.saveIdentityWithKeys(
                'testnet',
                { identityId: '1' },
                [{ privateKey: 'wif' }]
            )
            expect(result.success).toBe(false)
            // Use 'as any' to resolve TS(2339)
            expect((result.error as any).message).toContain('DB Error')
        })
    })
})
