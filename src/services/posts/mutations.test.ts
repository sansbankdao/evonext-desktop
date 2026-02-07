// src/services/posts/mutations.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as mutations from './mutations'
import * as fetching from './fetching' // Import to mock internal calls
import { invoke } from '@/utils/tauri'
import { EvoSDK } from '@dashevo/evo-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'

vi.mock('@/utils/tauri', () => ({ invoke: vi.fn() }))
vi.mock('./fetching', () => ({
    fetchDocumentsById: vi.fn() // MOCKING THE SIBLING MODULE
}))

vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({ network: { value: 'testnet' } })
}))

vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({
        identityId: 'mock_user',
        identity: { label: 'shomari' }
    })
}))

vi.mock('@dashevo/evo-sdk', () => ({
    EvoSDK: {
        testnetTrusted: vi.fn(() => ({
            connect: vi.fn().mockResolvedValue(true),
            documents: { create: vi.fn().mockResolvedValue({}) }
        }))
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
                getPublicKeys: () => [{ id: 0 }, { id: 1 }]
            })
        },
        stateTransitions: { broadcast: vi.fn().mockResolvedValue(true) }
    }))
}))

describe('Posts Mutations Service', () => {
    const validWif = 'cTog' + 'a'.repeat(48)

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('createPost', () => {
        it('should successfully create a post via EvoSDK', async () => {
            vi.mocked(invoke).mockResolvedValue({
                identities: { 'mock_user': [{ purpose: 0, securityLevel: 1, privateKey: validWif }] }
            })

            const result = await mutations.createPost({ content: 'test content' })
            expect(result?.content).toBe('test content')
            expect(EvoSDK.testnetTrusted).toHaveBeenCalled()
        })

        it('should throw if no identity is found', async () => {
            // Mock store to return null ID for this test
            const { useIdentityStore } = await import('@/stores/identity')
            vi.mocked(useIdentityStore).mockReturnValueOnce({ identityId: null } as any)

            await expect(mutations.createPost({ content: 'fail' }))
                .rejects.toThrow('Identity not found')
        })
    })

    describe('updatePost', () => {
        it('should return true when update is successful', async () => {
            // 1. Mock Private Key
            vi.mocked(invoke).mockResolvedValue({
                identities: { 'mock_user': [{ id: 1, privateKey: validWif }] }
            })

            // 2. Mock Fetch Check (This is what refactoring fixed!)
            vi.mocked(fetching.fetchDocumentsById).mockResolvedValue([{
                revision: 1,
                ownerId: 'mock_user'
            } as any])

            const success = await mutations.updatePost('post_123', { content: 'updated' })
            expect(success).toBe(true)
            expect(DashPlatformSDK).toHaveBeenCalled()
        })

        it('should return false if post to update is not found', async () => {
            vi.mocked(fetching.fetchDocumentsById).mockResolvedValue([])
            const success = await mutations.updatePost('missing', { content: 'err' })
            expect(success).toBe(false)
        })
    })
})
