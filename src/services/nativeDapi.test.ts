// src/services/nativeDapi.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { connectEvoSdk } from '@/services/platform'
import { nativeDapiRequest } from './nativeDapi'

vi.mock('@/services/platform', () => ({ connectEvoSdk: vi.fn() }))

function mockSdk(overrides: Record<string, unknown> = {}) {
    const query = vi.fn(async (_args?: unknown) => new Map())
    const fetchIdentity = vi.fn(async () => undefined)
    const balance = vi.fn(async () => undefined)
    const tokenBalances = vi.fn(async () => new Map())
    const sdk = {
        documents: { query: query },
        identities: { fetch: fetchIdentity, balance, tokenBalances },
        ...overrides
    }
    vi.mocked(connectEvoSdk).mockResolvedValue(sdk as never)
    return sdk
}

describe('nativeDapiRequest', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('translates get_documents into a native document query', async () => {
        const doc = { toJSON: () => ({ $id: 'd1', $ownerId: 'u1' }) }
        const sdk = mockSdk()
        vi.mocked(sdk.documents.query).mockResolvedValue(new Map([['d1', doc]]) as never)

        const res = await nativeDapiRequest('get_documents', [
            'contract1', 'post', [['language', '==', 'en']], [['language', 'asc'], ['$createdAt', 'desc']], 10
        ], 'testnet')

        expect(res.success).toBe(true)
        expect(res.result).toEqual([{ $id: 'd1', $ownerId: 'u1' }])
        expect(sdk.documents.query).toHaveBeenCalledWith({
            dataContractId: 'contract1',
            documentTypeName: 'post',
            where: [['language', '==', 'en']],
            orderBy: [['language', 'asc'], ['$createdAt', 'desc']],
            limit: 10
        })
    })

    it('parses a stringified whereClause (fetching.ts wire shape)', async () => {
        const sdk = mockSdk()
        await nativeDapiRequest('get_documents', [
            'contract1', 'post', JSON.stringify([['$createdAt', '>', 0]]), null, 20
        ], 'testnet')

        expect(sdk.documents.query).toHaveBeenCalledWith(
            expect.objectContaining({ where: [['$createdAt', '>', 0]], limit: 20 })
        )
        const args = vi.mocked(sdk.documents.query).mock.calls[0]![0] as Record<string, unknown>
        expect(args.orderBy).toBeUndefined()
    })

    it('translates get_document into a $id query and returns a single object', async () => {
        const doc = { toJSON: () => ({ $id: 'd1' }) }
        const sdk = mockSdk()
        vi.mocked(sdk.documents.query).mockResolvedValue(new Map([['d1', doc]]) as never)

        const res = await nativeDapiRequest('get_document', ['contract1', 'post', 'd1'], 'testnet')

        expect(sdk.documents.query).toHaveBeenCalledWith(expect.objectContaining({
            where: [['$id', '==', 'd1']],
            limit: 1
        }))
        expect(res.success).toBe(true)
        expect(res.result).toEqual({ $id: 'd1' })
    })

    it('translates identity_fetch and aliases id as identityId', async () => {
        const identity = { toJSON: () => ({ $formatVersion: '0', id: 'abc', balance: '100', revision: 0, publicKeys: [] }) }
        const sdk = mockSdk()
        vi.mocked(sdk.identities.fetch).mockResolvedValue(identity as never)

        const res = await nativeDapiRequest('identity_fetch', ['abc'], 'mainnet')

        expect(sdk.identities.fetch).toHaveBeenCalledWith('abc')
        expect(res.success).toBe(true)
        expect((res.result as Record<string, unknown>).identityId).toBe('abc')
        expect((res.result as Record<string, unknown>).id).toBe('abc')
    })

    it('returns a negative envelope for a missing identity', async () => {
        mockSdk() // fetch resolves undefined
        const res = await nativeDapiRequest('identity_fetch', ['nope'], 'mainnet')
        expect(res.success).toBe(false)
        expect(res.result).toBeNull()
    })

    it('translates get_identity_balance into a string balance', async () => {
        const sdk = mockSdk()
        vi.mocked(sdk.identities.balance).mockResolvedValue(123n as never)

        const res = await nativeDapiRequest('get_identity_balance', ['abc'], 'testnet')

        expect(sdk.identities.balance).toHaveBeenCalledWith('abc')
        expect(res.result).toEqual({ balance: '123' })
    })

    it('translates get_identity_token_balances into token entries', async () => {
        const sdk = mockSdk()
        vi.mocked(sdk.identities.tokenBalances).mockResolvedValue(
            new Map([['token1', 5n], ['token2', 0n]]) as never
        )

        const res = await nativeDapiRequest('get_identity_token_balances', ['abc', ['token1', 'token2']], 'mainnet')

        expect(sdk.identities.tokenBalances).toHaveBeenCalledWith('abc', ['token1', 'token2'])
        expect(res.result).toEqual([
            { tokenId: 'token1', balance: '5' },
            { tokenId: 'token2', balance: '0' }
        ])
    })

    it('rejects methods with no native translation with a clear error', async () => {
        mockSdk()
        await expect(
            nativeDapiRequest('get_total_supply', [], 'testnet')
        ).rejects.toThrow(/no native fallback translation/)
    })
})
