// src/stores/identity/actions/connectWriteOnly.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { connectWriteOnlyActions } from './connectWriteOnly'
import { DAPIService } from '@/services/identity/discovery/DAPIService'
import { KeyDerivationService } from '@/services/identity/keyDerivation.service'

vi.mock('@/services/identity/discovery/DAPIService')
vi.mock('@/services/identity/keyDerivation.service')

describe('connectWriteOnlyActions', () => {
    let store: any
    const actions = connectWriteOnlyActions()
    beforeEach(() => {
        vi.clearAllMocks()
        store = {
            isConnecting: false,
            connectionError: null,
            isAuthenticated: false,
            isConnected: false,
            identityId: null,
            identityIdx: 0,
            username: null,
            displayName: '',
            publicKeys: [],
            balance: '0',
            getCurrentNetwork: vi.fn().mockResolvedValue('testnet'),
            saveIdentity: vi.fn().mockResolvedValue({ success: true }),
            saveKeys: vi.fn().mockResolvedValue(true),
            saveMnemonicToStore: vi.fn().mockResolvedValue(true),
            saveToStorage: vi.fn().mockResolvedValue(undefined)
        }
    })
    it('should fail if no identity or seed is provided', async () => {
        const res2 = await actions.connectWriteOnlyFromDiscovered.call(store, { identityId: '1' } as any, '')
        expect(res2.success).toBe(false)
        expect(store.connectionError).toBe('Seed phrase is required for connection')
    })
    it('should derive keys and connect successfully', async () => {
        const mockIdentity = {
            identityId: 'id123',
            identityIdx: 0,
            publicKeys: [{ id: 0, purpose: 0, securityLevel: 0, data: 'hex' }]
        }
        vi.mocked(DAPIService.getIdentityById).mockResolvedValue({
            success: true,
            data: mockIdentity as any,
            searchType: 'none'
        } as any)
        vi.mocked(KeyDerivationService.getPrivateKeyWASM).mockResolvedValue({
            privateKey: { WIF: () => 'mock-wif' },
            publicKeyBytes: new Uint8Array([1, 2, 3]),
            sourceType: 'MNEMONIC'
        } as any)
        const result = await actions.connectWriteOnlyFromDiscovered.call(
            store,
            mockIdentity as any,
            'correct seed phrase'
        )
        expect(result.success).toBe(true)
        expect(store.isAuthenticated).toBe(true)
        expect(store.saveIdentity).toHaveBeenCalled()
        expect(store.saveKeys).toHaveBeenCalled()
        expect(store.saveMnemonicToStore).toHaveBeenCalled()
    })
})
