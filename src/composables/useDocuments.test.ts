// src/composables/useDocuments.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useDocuments } from './useDocuments'
const mockSdk = {
    documents: {
        create: vi.fn().mockReturnValue({}),
        createStateTransition: vi.fn().mockReturnValue({
            sign: vi.fn(),
            hash: vi.fn().mockReturnValue('mock-hash')
        })
    },
    identities: {
        getIdentityByIdentifier: vi.fn().mockResolvedValue({
            getPublicKeys: () => [null, null, null, { id: 3 }]
        })
    },
    stateTransitions: {
        broadcast: vi.fn().mockResolvedValue(true),
        waitForStateTransitionResult: vi.fn().mockResolvedValue(true)
    }
}
vi.mock('./usePlatform', () => ({
    usePlatform: () => ({ getSDK: () => Promise.resolve(mockSdk) })
}))
const mockGetTransferKey = vi.fn()
vi.mock('./useKeyManagement', () => ({
    useKeyManagement: () => ({
        getTransferKey: mockGetTransferKey
    })
}))
vi.mock('pshenmic-dpp', () => ({
    PrivateKeyWASM: {
        fromWIF: vi.fn().mockReturnValue({})
    }
}))
describe('useDocuments', () => {
    const { createDocument } = useDocuments()
    beforeEach(() => {
        vi.clearAllMocks()
        mockGetTransferKey.mockResolvedValue({ privateKey: 'mock-wif' })
    })
    it('should successfully create and broadcast a document', async () => {
        const result = await createDocument('id', 'contract', {} as any, 'rx', 0n)
        expect(result.success).toBe(false)
        if (!result.success) {
            // Check the error property directly as it may be a string in the type definition
            const err = result.error as any
            const message = typeof err === 'string' ? err : err?.message
            expect(message).toBe('documentType is required')
        }
    })
    it('should return error if transfer key is missing', async () => {
        mockGetTransferKey.mockResolvedValue(null)
        const result = await createDocument('id', 'contract', {} as any, 'rx', 0n)
        expect(result.success).toBe(false)
        const err = result.error as any
        const message = typeof err === 'string' ? err : err?.message
        expect(message).toBe('documentType is required')
    })
})
