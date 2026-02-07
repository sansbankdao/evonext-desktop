// src/composables/useTransactions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTransactions } from './useTransactions'
import { MIN_CREDIT_TRANSFER } from '@/constants'

// Mock Dependencies
vi.mock('./usePlatform', () => ({
    usePlatform: () => ({
        getSDK: vi.fn().mockResolvedValue({
            identities: {
                getIdentityByIdentifier: vi.fn().mockResolvedValue({
                    getPublicKeys: () => [{ keyIdNumber: 3 }]
                }),
                getIdentityNonce: vi.fn().mockResolvedValue(BigInt(10)),
                createStateTransition: vi.fn().mockReturnValue({
                    sign: vi.fn(),
                    hash: () => 'mock_st_hash'
                })
            },
            stateTransitions: {
                broadcast: vi.fn().mockResolvedValue(true),
                waitForStateTransitionResult: vi.fn().mockResolvedValue(true)
            },
            tokens: {
                createBaseTransition: vi.fn().mockResolvedValue({}),
                createStateTransition: vi.fn().mockReturnValue({
                    sign: vi.fn(),
                    hash: () => 'mock_token_hash'
                })
            }
        })
    })
}))

vi.mock('./useKeyManagement', () => ({
    useKeyManagement: () => ({
        getTransferKey: vi.fn().mockResolvedValue({
            privateKey: 'L1mockprivatekeywif',
            keyId: 3
        })
    })
}))

vi.mock('./useNetwork', () => ({
    useNetwork: () => ({
        network: { value: 'testnet' }
    })
}))

// Mock WASM/heavy dependencies
vi.mock('pshenmic-dpp', () => ({
    PrivateKeyWASM: {
        fromWIF: vi.fn().mockReturnValue({})
    }
}))

describe('useTransactions Composable', () => {
    const {
        atomicToDash,
        formatDashAmount,
        shortTxid,
        fetchIdentityTransfers,
        sendCredits
    } = useTransactions()

    beforeEach(() => {
        vi.clearAllMocks()
        vi.stubGlobal('fetch', vi.fn())
    })

    describe('Formatting Helpers', () => {
        it('atomicToDash should convert credits to DASH units', () => {
            expect(atomicToDash(100_000_000)).toBe(1)
            expect(atomicToDash(BigInt(50_000_000))).toBe(0.5)
        })

        it('formatDashAmount should return localized string', () => {
            // Using 100000000 (1.00)
            const result = formatDashAmount(100000000)
            expect(result).toContain('1.00')
        })

        it('shortTxid should truncate hash correctly', () => {
            const hash = '1234567890abcdef1234567890abcdef'
            const shortened = shortTxid(hash, 8)
            expect(shortened).toBe('1234...bcdef')
        })
    })

    describe('API Fetching', () => {
        it('fetchIdentityTransfers should map explorer data to ITransaction', async () => {
            const mockResponse = {
                resultSet: [
                    {
                        hash: 'tx_1',
                        sender: 'me',
                        recipient: 'you',
                        amount: '1000',
                        timestamp: Date.now(),
                        status: 'SUCCESS',
                        type: 'IDENTITY_CREDIT_TRANSFER'
                    }
                ]
            }

            vi.mocked(fetch).mockResolvedValue({
                ok: true,
                json: async () => mockResponse
            } as Response)

            const result = await fetchIdentityTransfers('me')

            expect(result.success).toBe(true)
            if (result.success) {
                expect(result.data).toHaveLength(1)
                expect(result.data[0].amount).toBe(1000)
                expect(result.data[0].direction).toBe('OUTGOING')
            }
        })

        it('should handle explorer API errors gracefully', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                statusText: 'Internal Server Error'
            } as Response)

            const result = await fetchIdentityTransfers('any')
            expect(result.success).toBe(false)
        })
    })

    describe('Transaction Execution', () => {
        it('sendCredits should fail if amount is below minimum', async () => {
            const result = await sendCredits({
                identityId: 'id',
                identityIdx: 0,
                receiver: 'rec',
                credits: MIN_CREDIT_TRANSFER - 1n
            })

            expect(result.success).toBe(false)
            expect(result.error?.message).toContain('Minimum credit')
        })

        it('sendCredits should successfully broadcast an ST', async () => {
            const result = await sendCredits({
                identityId: 'id',
                identityIdx: 0,
                receiver: 'rec',
                credits: MIN_CREDIT_TRANSFER + 100n
            })

            expect(result.success).toBe(true)
            expect(result.data?.txid).toBe('mock_st_hash')
        })

        it('sendCredits should allow providing an explicit private key', async () => {
            const result = await sendCredits({
                identityId: 'id',
                identityIdx: 0,
                receiver: 'rec',
                credits: MIN_CREDIT_TRANSFER + 100n,
                privateKey: 'explicit_wif'
            })

            expect(result.success).toBe(true)
        })
    })
})
