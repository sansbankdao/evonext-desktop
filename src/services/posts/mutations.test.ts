// src/services/posts/mutations.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as mutations from './mutations'
import * as fetching from './fetching'
import { invoke } from '@/utils/tauri'
vi.mock('@/utils/tauri', () => ({ invoke: vi.fn() }))
vi.mock('./fetching', () => ({ fetchDocumentsById: vi.fn() }))
vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({ network: { value: 'testnet' } })
}))
vi.mock('@/stores/identity', () => ({
    useIdentityStore: vi.fn(() => ({
        identityId: 'mock_user',
        identity: { identityId: 'mock_user', username: 'test' }
    }))
}))
vi.mock('@/services/crypto', () => ({
    randomBytes: vi.fn().mockResolvedValue(new Uint8Array(32))
}))
vi.mock('@evonext/utils', () => ({
    binToHex: vi.fn().mockReturnValue('aa'.repeat(32))
}))
vi.mock('pshenmic-dpp', () => ({
    PrivateKeyWASM: { fromWIF: vi.fn().mockReturnValue({}) }
}))
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
vi.mock('@dashevo/evo-sdk', () => ({
    EvoSDK: {
        testnetTrusted: vi.fn().mockReturnValue({
            connect: vi.fn().mockResolvedValue(undefined),
            documents: {
                create: vi.fn().mockResolvedValue({ id: 'new_post_id' })
            }
        }),
        mainnetTrusted: vi.fn().mockReturnValue({
            connect: vi.fn().mockResolvedValue(undefined),
            documents: {
                create: vi.fn().mockResolvedValue({ id: 'new_post_id' })
            }
        })
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
        vi.mocked(invoke).mockResolvedValue({
            identities: { 'mock_user': [{ id: 1, purpose: 0, securityLevel: 2, privateKey: validWif }] }
        })
        vi.mocked(fetching.fetchDocumentsById).mockResolvedValue([])
        await expect(mutations.updatePost('missing', { documentId: 'any' }))
            .rejects.toThrow('Post missing not found on chain')
    })
    it('createPost should throw when no identity found', async () => {
        const { useIdentityStore } = await import('@/stores/identity')
        vi.mocked(useIdentityStore).mockReturnValueOnce({ identityId: null } as any)
        await expect(mutations.createPost({ content: 'hello' } as any))
            .rejects.toThrow('Identity not found')
    })
    it('createPost should throw when no auth key found', async () => {
        vi.mocked(invoke).mockResolvedValue({ identities: { 'mock_user': [] } })
        await expect(mutations.createPost({ content: 'hello' } as any))
            .rejects.toThrow('Auth Key not found')
    })
    it('createPost should succeed with valid auth key', async () => {
        vi.mocked(invoke).mockResolvedValue({
            identities: { 'mock_user': [{ purpose: 0, securityLevel: 1, privateKey: validWif }] }
        })
        const result = await mutations.createPost({
            content: 'Hello World',
            language: 'en'
        } as any)
        expect(result).toBeDefined()
        expect(result!.ownerId).toBe('mock_user')
        expect(result!.content).toBe('Hello World')
    })
    it('createPost should handle optional fields', async () => {
        vi.mocked(invoke).mockResolvedValue({
            identities: { 'mock_user': [{ purpose: 0, securityLevel: 0, privateKey: validWif }] }
        })
        const result = await mutations.createPost({
            content: 'Sensitive post',
            language: 'fr',
            isSensitive: true,
            mediaUrl: ['https://example.com/img.png'],
            remix: 'original_post_id'
        } as any)
        expect(result).toBeDefined()
        expect(result!.content).toBe('Sensitive post')
    })
    it('updatePost should throw when no WIF found', async () => {
        vi.mocked(invoke).mockResolvedValue({
            identities: { 'mock_user': [{ purpose: 1, securityLevel: 0, privateKey: null }] }
        })
        await expect(mutations.updatePost('post_1', { documentId: 'post_1', content: 'x' }))
            .rejects.toThrow('No suitable WIF found')
    })
})
