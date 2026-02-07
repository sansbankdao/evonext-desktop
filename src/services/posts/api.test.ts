// src/services/posts/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './api'
import { invoke } from '@/utils/tauri'
vi.mock('@/utils/tauri', () => ({ invoke: vi.fn() }))
vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({ network: { value: 'testnet' } })
}))
vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({
        identityId: 'mock_id',
        identity: { label: 'shomari' }
    })
}))
vi.mock('@dashevo/evo-sdk', () => ({
    EvoSDK: {
        testnetTrusted: vi.fn(() => ({
            connect: vi.fn().mockResolvedValue(true),
            documents: { create: vi.fn().mockResolvedValue({}) }
        })),
        mainnetTrusted: vi.fn(() => ({ connect: vi.fn() }))
    }
}))
vi.mock('dash-platform-sdk', () => ({
    DashPlatformSDK: vi.fn().mockImplementation(() => ({
        documents: {
            create: vi.fn().mockResolvedValue({ id: 'upd' }),
            createStateTransition: vi.fn().mockResolvedValue({
                sign: vi.fn(),
                signaturePublicKeyId: 0
            })
        },
        identities: {
            getIdentityContractNonce: vi.fn().mockResolvedValue(1n),
            getIdentityByIdentifier: vi.fn().mockResolvedValue({
                getPublicKeys: () => [
                    { id: 0, purpose: 0, securityLevel: 0 }, // Master
                    { id: 1, purpose: 0, securityLevel: 2 }  // High Security
                ]
            })
        },
        stateTransitions: { broadcast: vi.fn().mockResolvedValue(true) }
    }))
}))
vi.mock('pshenmic-dpp', () => ({ PrivateKeyWASM: { fromWIF: vi.fn().mockReturnValue({}) } }))
vi.mock('@/services/crypto', () => ({ randomBytes: vi.fn().mockReturnValue(new Uint8Array(32)) }))
describe('Posts API Service (Refactored)', () => {
    beforeEach(() => { vi.clearAllMocks() })
    it('updatePost should find correct public key and return true', async () => {
        vi.mocked(invoke).mockResolvedValue({
            identities: {
                'mock_id': [{ id: 1, purpose: 0, securityLevel: 2, privateKey: 'wif' }]
            }
        })
        vi.spyOn(api, 'fetchDocumentsById').mockResolvedValue([{ revision: 1 } as any])
        const success = await api.updatePost('post_123', { content: 'fixed' })
        expect(success).toBe(true)
    })
})
