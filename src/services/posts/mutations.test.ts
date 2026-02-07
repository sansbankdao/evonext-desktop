// src/services/posts/mutations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as mutations from './mutations'
import * as fetching from './fetching'
import { invoke } from '@/utils/tauri'
import { DashPlatformSDK } from 'dash-platform-sdk'
vi.mock('@/utils/tauri', () => ({ invoke: vi.fn() }))
vi.mock('./fetching', () => ({ fetchDocumentsById: vi.fn() }))
vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({ network: { value: 'testnet' } })
}))
vi.mock('@/stores/identity', () => ({
    useIdentityStore: vi.fn(() => ({ identityId: 'mock_user' }))
}))
vi.mock('@/services/crypto', () => ({
    randomBytes: vi.fn().mockResolvedValue(new Uint8Array(32))
}))
vi.mock('pshenmic-dpp', () => ({
    PrivateKeyWASM: { fromWIF: vi.fn().mockReturnValue({}) }
}))
// FIXED: Use Class syntax for mocking constructor
vi.mock('dash-platform-sdk', () => ({
    DashPlatformSDK: class {
        documents = {
            create: vi.fn().mockResolvedValue({ id: 'upd', toJSON: () => ({}) }),
            createStateTransition: vi.fn().mockResolvedValue({ sign: vi.fn() })
        }
        identities = {
            getIdentityContractNonce: vi.fn().mockResolvedValue(1n),
            getIdentityByIdentifier: vi.fn().mockResolvedValue({
                getPublicKeys: () => [{ id: 0 }, { id: 1, securityLevel: 2, purpose: 0 }]
            })
        }
        stateTransitions = { broadcast: vi.fn().mockResolvedValue(true) }
    }
}))
describe('Posts Mutations Service', () => {
    const validWif = 'cTog' + 'a'.repeat(48)
    beforeEach(() => { vi.clearAllMocks() })
    it('updatePost should return true when successful', async () => {
        vi.mocked(invoke).mockResolvedValue({
            identities: { 'mock_user': [{ id: 1, purpose: 0, securityLevel: 2, privateKey: validWif }] }
        })
        vi.mocked(fetching.fetchDocumentsById).mockResolvedValue([{ revision: 1, ownerId: 'mock_user' } as any])
        const success = await mutations.updatePost('post_123', {
            documentId: 'post_123',
            content: 'updated'
        })
        expect(success).toBe(true)
    })
    it('updatePost should throw meaningful error if post missing', async () => {
        // FIXED: Added purpose and securityLevel to pass the WIF check
        vi.mocked(invoke).mockResolvedValue({
            identities: { 'mock_user': [{ id: 1, purpose: 0, securityLevel: 2, privateKey: validWif }] }
        })
        vi.mocked(fetching.fetchDocumentsById).mockResolvedValue([])
        await expect(mutations.updatePost('missing', { documentId: 'any' }))
            .rejects.toThrow('Post missing not found on chain')
    })
})
