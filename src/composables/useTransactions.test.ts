// src/composables/useTransactions.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTransactions } from './useTransactions'
import { MIN_CREDIT_TRANSFER } from '@/constants'

// --- MOCK DEFINITIONS ---

const mockSdk = {
    identities: {
        getIdentityByIdentifier: vi.fn().mockResolvedValue({
            getPublicKeys: () => [{ keyIdNumber: 3 }, { keyId: 5 }]
        }),
        getIdentityNonce: vi.fn().mockResolvedValue(BigInt(10)),
        createStateTransition: vi.fn().mockReturnValue({
            sign: vi.fn(),
            hash: () => 'mock_st_hash'
        }),
        creditWithdrawal: vi.fn().mockResolvedValue({ hash: 'withdrawal_hash' })
    },
    stateTransitions: {
        broadcast: vi.fn().mockResolvedValue(true),
        waitForStateTransitionResult: vi.fn().mockResolvedValue(true)
    },
    tokens: {
        createBaseTransition: vi.fn().mockResolvedValue({}),
        createStateTransition: vi.fn().mockReturnValue({
            sign: vi.fn(),
            hash: () => 'token_tx_hash'
        })
    },
    connect: vi.fn().mockResolvedValue(true)
}

vi.mock('./usePlatform', () => ({
    usePlatform: () => ({
        getSDK: vi.fn().mockResolvedValue(mockSdk)
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

vi.mock('pshenmic-dpp', () => ({
    PrivateKeyWASM: {
        fromWIF: vi.fn().mockReturnValue({})
    }
}))

vi.mock('@dashevo/evo-sdk', () => ({
    EvoSDK: {
        testnetTrusted: () => mockSdk,
        mainnetTrusted: () => mockSdk
    }
}))

// --- TEST SUITE ---

describe('useTransactions Composable Full Suite', () => {
    const {
        atomicToDash,
        formatDashAmount,
        shortTxid,
        fetchIdentityTransfers,
        sendCredits,
        sendToken,
        withdrawDash
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
            const result = formatDashAmount(100000000)
            expect(result).toContain('1.00')
        })

        it('shortTxid should truncate hash correctly', () => {
            const hash = '1234567890abcdef1234567890abcdef'
            const shortened = shortTxid(hash, 8)
            expect(shortened).toBe('1234...cdef')
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
                expect(result.data!).toHaveLength(1)
                expect(result.data![0]!.amount).toBe(1000)
                expect(result.data![0]!.direction).toBe('OUTGOING')
            }
        })

        it('should handle explorer API errors gracefully', async () => {
            vi.mocked(fetch).mockResolvedValue({
                ok: false,
                statusText: 'Internal Server Error'
            } as Response)

            const result = await fetchIdentityTransfers('any')
            expect(result.success).toBe(false)
            if (!result.success) {
                expect(result.code).toBe('FETCH_IDENTITY_TRANSFERS_FAILED')
            }
        })
    })

    describe('Credit Transactions', () => {
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
            expect(result.data!.txid).toBe('mock_st_hash')
            expect(mockSdk.stateTransitions.broadcast).toHaveBeenCalled()
        })

        it('sendCredits should handle missing public key errors', async () => {
            mockSdk.identities.getIdentityByIdentifier.mockResolvedValueOnce({
                getPublicKeys: () => [{ keyIdNumber: 99 }] // Mismatched ID
            })

            const result = await sendCredits({
                identityId: 'id',
                identityIdx: 0,
                receiver: 'rec',
                credits: MIN_CREDIT_TRANSFER + 100n
            })

            expect(result.success).toBe(false)
            expect(result.error?.message).toContain('Public Key ID 3 missing')
        })
    })

    describe('Token Transactions', () => {
        it('sendToken should execute full token broadcast', async () => {
            const result = await sendToken({
                identityId: 'id',
                identityIdx: 0,
                tokenId: 'token123',
                receiver: 'rec',
                atomicUnits: 100n
            })

            expect(result.success).toBe(true)
            expect(result.data!.txid).toBe('token_tx_hash')
            expect(mockSdk.tokens.createStateTransition).toHaveBeenCalled()
        })

        it('sendToken should catch execution errors', async () => {
            mockSdk.tokens.createBaseTransition.mockRejectedValueOnce(new Error('Token Contract Not Found'))

            const result = await sendToken({
                identityId: 'id',
                identityIdx: 0,
                tokenId: 'bad_token',
                receiver: 'rec',
                atomicUnits: 100n
            })

            expect(result.success).toBe(false)
            expect(result.error?.message).toBe('Token Contract Not Found')
        })
    })

    describe('Dash Withdrawals', () => {
        it('withdrawDash should call credit withdrawal on EvoSDK', async () => {
            const result = await withdrawDash({
                identityId: 'id',
                recipientAddress: 'addr123',
                amountDash: 0.5
            })

            expect(result.success).toBe(true)
            expect(result.data!.txid).toBe('withdrawal_hash')
            expect(mockSdk.identities.creditWithdrawal).toHaveBeenCalled()
        })

        it('withdrawDash should handle EvoSDK insolvency or broadcast errors', async () => {
            mockSdk.identities.creditWithdrawal.mockRejectedValueOnce(new Error('Insufficient Layer 1 Liquidity'))

            const result = await withdrawDash({
                identityId: 'id',
                recipientAddress: 'addr',
                amountDash: 1.0
            })

            expect(result.success).toBe(false)
            expect(result.error?.message).toBe('Insufficient Layer 1 Liquidity')
            expect(result.error?.step).toBe('WITHDRAWAL')
        })
    })
})
