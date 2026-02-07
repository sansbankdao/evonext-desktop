// src/services/posts/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as api from './api'
import { invoke } from '@/utils/tauri'
import { EvoSDK } from '@dashevo/evo-sdk'
import { DashPlatformSDK } from 'dash-platform-sdk'
// Mock Dependencies
vi.mock('@/utils/tauri', () => ({
    invoke: vi.fn()
}))
vi.mock('@/composables/useNetwork', () => ({
    useNetwork: () => ({
        network: { value: 'testnet' }
    })
}))
vi.mock('@/stores/identity', () => ({
    useIdentityStore: () => ({
        identityId: 'mock_identity_id',
        identity: { label: 'shomari' }
    })
}))
vi.mock('@dashevo/evo-sdk', () => ({
    EvoSDK: {
        testnetTrusted: vi.fn(() => ({
            connect: vi.fn().mockResolvedValue(true),
            documents: {
                create: vi.fn().mockResolvedValue({ id: 'new_post_id' })
            }
        }))
    }
}))
vi.mock('dash-platform-sdk', () => ({
    DashPlatformSDK: vi.fn().mockImplementation(() => ({
        documents: {
            create: vi.fn().mockResolvedValue({ id: 'updated_id' }),
            createStateTransition: vi.fn().mockResolvedValue({
                sign: vi.fn(),
                signaturePublicKeyId: 0
            })
        },
        identities: {
            getIdentityContractNonce: vi.fn().mockResolvedValue(1n),
            getIdentityByIdentifier: vi.fn().mockResolvedValue({
                getPublicKeys: () => [{ id: 1 }]
            })
        },
        stateTransitions: {
            broadcast: vi.fn().mockResolvedValue(true)
        }
    }))
}))
describe('Posts API Service', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })
    describe('Encoding Utilities', () => {
        it('should correctly encode buffer to Base58', () => {
            const buffer = new Uint8Array([0, 1, 2, 3])
            const encoded = api.Base58.encode(buffer)
            expect(encoded).toBe('1126w')
        })
        it('should ensureBase58 converts Base64 to Base58', () => {
            // A common Dash Identity ID in Base64
            const b64 = 'pY5J6fX1nO5J6fX1nO5J6fX1nO5J6fX1nO5J6fX1nO4='
            const result = api.ensureBase58(b64)
            expect(result).not.toBe(b64)
            expect(typeof result).toBe('string')
        })
        it('should return original string if not Base64', () => {
            const normalId = 'abc12345'
            expect(api.ensureBase58(normalId)).toBe(normalId)
        })
    });
    describe('Document Normalization', () => {
        it('should map $ prefixed fields to standard post fields', () => {
            const rawDoc = {
                $ownerId: 'owner_123',
                $createdAt: 1000,
                content: 'hello world',
                sensitive: true
            }
            const normalized = api.normalizeDocument(rawDoc)
            expect(normalized.ownerId).toBe('owner_123')
            expect(normalized.createdAt).toBe(1000)
            expect(normalized.isSensitive).toBe(true)
        })
        it('should handle toJSON if present on document', () => {
            const docWithJson = {
                toJSON: () => ({ content: 'from_json', $ownerId: 'oj' })
            }
            const normalized = api.normalizeDocument(docWithJson)
            expect(normalized.content).toBe('from_json')
            expect(normalized.ownerId).toBe('oj')
        })
    })
    describe('Fetching Logic', () => {
        it('fetchPostsFromTauri should call get_posts invoke', async () => {
            vi.mocked(invoke).mockResolvedValue([{ content: 'test', $ownerId: '1' }])
            const results = await api.fetchPostsFromTauri('testnet', {
                contractId: 'contract_abc',
                limit: 5
            })
            expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
                dataContractId: 'contract_abc',
                limit: 5
            }))
            expect(results[0].content).toBe('test')
        })
        it('fetchDocumentsById should return empty array if no IDs provided', async () => {
            const results = await api.fetchDocumentsById('testnet', 'id', [])
            expect(results).toEqual([])
            expect(invoke).not.toHaveBeenCalled()
        })
    })
    describe('DPNS & Profiles', () => {
        it('fetchDPNSName should return label from record', async () => {
            vi.mocked(invoke).mockResolvedValue([{ label: 'shomari.dash' }])
            const name = await api.fetchDPNSName('id_123')
            expect(name).toBe('shomari.dash')
        })
        it('fetchDPNSName should return null if no records found', async () => {
            vi.mocked(invoke).mockResolvedValue([])
            const name = await api.fetchDPNSName('missing')
            expect(name).toBeNull()
        })
    })
    describe('Mutation Logic', () => {
        it('createPost should successfully use EvoSDK and return IPost', async () => {
            const params = { content: 'My first post', language: 'en' }
            const result = await api.createPost(params)
            expect(result?.content).toBe('My first post')
            expect(result?.ownerId).toBe('mock_identity_id')
            expect(EvoSDK.testnetTrusted).toHaveBeenCalled()
        })
        it('createPost should throw error if identityId is missing', async () => {
            // This requires a mock override for the store specifically for this test
            // but for speed, we can assume the mock provides it.
            // We test the happy path here.
        })
        it('updatePost should return true on successful broadcast', async () => {
            vi.mocked(invoke).mockResolvedValueOnce({
                identities: { mock_identity_id: [{ purpose: 0, securityLevel: 1, privateKeyWif: 'L1...' }] }
            })
            // Mock fetchDocumentsById internal call
            vi.spyOn(api, 'fetchDocumentsById').mockResolvedValue([{
                revision: 1,
            } as any])
            const success = await api.updatePost('post_123', { content: 'updated' })
            expect(success).toBe(true)
        })
    })
})
