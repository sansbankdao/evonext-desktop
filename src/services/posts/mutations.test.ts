// src/services/posts/mutations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as mutations from './mutations'
import * as fetching from './fetching'
import { invoke } from '@/utils/tauri'
import { DashPlatformSDK } from 'dash-platform-sdk'
import { useIdentityStore } from '@/stores/identity'

vi.mock('@/utils/tauri', () => ({ invoke: vi.fn() }))
vi.mock('./fetching', () => ({
    fetchDocumentsById: vi.fn()
}))

vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({ network: { value: 'testnet' } })
}))

vi.mock('@/stores/identity', () => ({
    useIdentityStore: vi.fn(() => ({
        identityId: 'mock_user',
        identity: { label: 'shomari' }
    }))
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
            create: vi.fn().mockResolvedValue({ id: 'upd', toJSON: () => ({}) }),
            createStateTransition: vi.fn().mockResolvedValue({
                sign: vi.fn(),
                signaturePublicKeyId: 0
            })
        },
        identities: {
            getIdentityContractNonce: vi.fn().mockResolvedValue(1n),
            getIdentityByIdentifier: vi.fn().mockResolvedValue({
                getPublicKeys: () => [
                    { id: 0, purpose: 0, securityLevel: 0 },
                    { id: 1, purpose: 0, securityLevel: 2 }
                ]
            })
        },
        stateTransitions: { broadcast: vi.fn().mockResolvedValue(true) }
    }))
}))

vi.mock('pshenmic-dpp', () => ({
    PrivateKeyWASM: { fromWIF: vi.fn().mockReturnValue({}) }
}))

vi.mock('@/services/crypto', () => ({
    randomBytes: vi.fn(() => new Uint8Array(32))
}))

describe('Posts Mutations Service', () => {
    const validWif = 'cTog' + 'a'.repeat(48)

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('updatePost', () => {
        it('should return true when update is successful', async () => {
            // FIXED: Ensure the mock key has 'id: 1' to match the Public Key in the SDK mock
            vi.mocked(invoke).mockResolvedValue({
                identities: {
                    'mock_user': [{ id: 1, purpose: 0, securityLevel: 2, privateKey: validWif }]
                }
            })

            vi.mocked(fetching.fetchDocumentsById).mockResolvedValue([{
                revision: 1,
                ownerId: 'mock_user'
            } as any])

            const success = await mutations.updatePost('post_123', { content: 'updated' })

            // If this is still false, it means an error occurred in the try/catch.
            // In a real debug scenario, you'd add console.log(e) in the source's catch.
            expect(success).toBe(true)
        })

        it('should return false if post fetch fails', async () => {
            vi.mocked(fetching.fetchDocumentsById).mockResolvedValue([])
            const success = await mutations.updatePost('missing', { content: 'err' })
            expect(success).toBe(false)
        })
    })

    describe('createPost', () => {
        it('should successfully create a post via EvoSDK', async () => {
            vi.mocked(invoke).mockResolvedValue({
                identities: { 'mock_user': [{ purpose: 0, securityLevel: 1, privateKey: validWif }] }
            })

            const result = await mutations.createPost({ content: 'test content' })
            expect(result?.content).toBe('test content')
        })
    })
})
