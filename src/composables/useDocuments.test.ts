// src/composables/useDocuments.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GasFeesPaidByWASM } from 'pshenmic-dpp'
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
    },
    GasFeesPaidByWASM: {
        ContractOwner: 'ContractOwner'
    }
}))
describe('useDocuments', () => {
    const { createDocument } = useDocuments()
    beforeEach(() => {
        vi.clearAllMocks()
    })
    it('should fail if transfer key is missing', async () => {
        mockGetTransferKey.mockResolvedValueOnce(null)
        const validPaymentInfo = { documentType: 'contract' }
        const result = await createDocument('id', 'text', 'contract', validPaymentInfo as any, 0n)
        expect(result.success).toBe(false)
        if (!result.success) {
             // Use 'as any' to resolve TS(2339)
            const error = result.error as any
            const message = error?.message || error
            expect(message).toContain('No transfer key found')
        }
    })
    it('should successfully create and broadcast a document with valid type', async () => {
        mockGetTransferKey.mockResolvedValue({ privateKey: 'L1mockprivatekeywif', keyId: 3 })
        const validPaymentInfo = {
            tokenContractId: 'mock_contract_id',
            tokenContractPosition: 0,
            minimumTokenCost: 0n,
            maximumTokenCost: 0n,
            gasFeesPaidBy: GasFeesPaidByWASM.ContractOwner
        }
        const result = await createDocument('id', 'contract', 'contract', validPaymentInfo, 0n)
        expect(result.success).toBe(true)
        if (result.success) {
            expect(result.data).toHaveProperty('txid')
        }
    })
})
