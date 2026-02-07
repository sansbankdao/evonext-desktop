// src/stores/identity/actions/connectWriteOnly.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { connectWriteOnlyActions } from './connectWriteOnly'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn().mockResolvedValue(true)
}))
vi.mock('@/services/identity/discovery/DAPIService', () => ({
    DAPIService: {
        getIdentityById: vi.fn()
    }
}))
vi.mock('@/services/identity/keyDerivation.service', () => ({
    KeyDerivationService: {
        getPrivateKeyWASM: vi.fn()
    }
}))
describe('connectWriteOnlyActions', () => {
    let store: any
    const actions = connectWriteOnlyActions()
    beforeEach(() => {
        vi.clearAllMocks()
        store = {
            isConnecting: false,
            connectionError: null,
            isAuthenticated: false,
            getCurrentNetwork: vi.fn().mockResolvedValue('testnet'),
            saveKeys: vi.fn().mockResolvedValue(true),
            saveMnemonicToStore: vi.fn().mockResolvedValue(true),
            saveIdentityDataToStore: vi.fn().mockResolvedValue(true),
            saveIdentityData: vi.fn().mockResolvedValue(true),
            saveMnemonic: vi.fn().mockResolvedValue(true)
        }
    })
    it('should fail if no identity or seed is provided', async () => {
        const res1 = await actions.connectWriteOnlyFromDiscovered.call(store, null as any, 'seed')
        expect(res1.success).toBe(false)
        expect(store.connectionError).toContain('No discovered identity')
        const res2 = await actions.connectWriteOnlyFromDiscovered.call(store, { identityId: '1' } as any, '')
        expect(res2.success).toBe(false)
        expect(store.connectionError).toContain('Seed phrase is required')
    })
    it('should derive keys and connect successfully', async () => {
        const mockIdentity = {
            identityId: 'id123',
            publicKeys: [{ id: 0, purpose: 0, securityLevel: 0 }]
        }
        vi.mocked(DAPIService.getIdentityById).mockResolvedValue({
            success: true,
            searchType: 'unique',
            data: { ...mockIdentity, balance: 1000, revision: 1 } as any
        })
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            privateKey: { WIF: () => 'mock-wif' }
        } as any)
        const result = await actions.connectWriteOnlyFromDiscovered.call(
            store,
            { identityId: 'id123', identityIdx: 0 } as any,
            'correct seed phrase'
        )
        expect(result.success).toBe(true)
        expect(store.isAuthenticated).toBe(true)
        expect(store.identityId).toBe('id123')
        expect(store.saveKeys).toHaveBeenCalled()
    })
    it('should handle errors during connection', async () => {
        vi.mocked(DAPIService.getIdentityById).mockRejectedValue(new Error('Network Error'))
        const result = await actions.connectWriteOnlyFromDiscovered.call(
            store,
            { identityId: 'id123' } as any,
            'seed'
        )
        expect(result.success).toBe(false)
        expect(store.connectionError).toBe('Network Error')
    })
})
