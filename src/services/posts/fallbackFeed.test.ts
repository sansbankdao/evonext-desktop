// src/services/posts/fallbackFeed.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { invoke } from '@/utils/tauri'
import { connectEvoSdk } from '@/services/platform'
import {
    fetchSocialFeedViaSdk,
    fetchSocialFeedWithFallback
} from './fallbackFeed'
import type { ISocialFeedPage } from '@/types/social'

vi.mock('@/utils/tauri', () => ({ invoke: vi.fn() }))
vi.mock('@/services/platform', () => ({ connectEvoSdk: vi.fn() }))
vi.mock('@/constants', () => ({
    DASHPAY_CONTRACT_ID_MAINNET: 'dashpay_main',
    DASHPAY_CONTRACT_ID_TESTNET: 'dashpay_test',
    DPNS_CONTRACT_ID_MAINNET: 'dpns_main',
    DPNS_CONTRACT_ID_TESTNET: 'dpns_test',
    YAPPR_PROFILE_CONTRACT_ID_MAINNET: 'profile_main',
    YAPPR_PROFILE_CONTRACT_ID_TESTNET: 'profile_test',
    getActivePostContracts: vi.fn(() => ['evo_test', 'yappr_test'])
}))

function makePage(posts: any[] = []): ISocialFeedPage {
    return { posts, fetchedCounts: {}, duplicateCount: 0 } as unknown as ISocialFeedPage
}

function postDoc(id: string, owner: string, extra: any = {}) {
    return { $id: id, $ownerId: owner, $createdAt: 1000, content: 'hi', language: 'en', ...extra }
}

function mockSdk(queryImpl?: (args: any) => any) {
    const query = vi.fn(async (args: any) => queryImpl ? queryImpl(args) : new Map())
    const sdk = { documents: { query } }
    vi.mocked(connectEvoSdk).mockResolvedValue(sdk as any)
    return query
}

describe('fallbackFeed', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('returns the primary page without touching the SDK when the proxy works', async () => {
        const page = makePage([{ id: 'p1' }])
        vi.mocked(invoke).mockResolvedValue(page as any)
        const query = mockSdk()

        const res = await fetchSocialFeedWithFallback('testnet', 20, null)

        expect(res).toBe(page)
        expect(invoke).toHaveBeenCalledTimes(1)
        expect(invoke).toHaveBeenCalledWith('fetch_social_feed', {
            network: 'testnet', limit: 20, ownerId: null
        })
        expect(connectEvoSdk).not.toHaveBeenCalled()
        expect(query).not.toHaveBeenCalled()
    })

    it('falls back to the prefetched command when the primary transport fails', async () => {
        const fallbackPage = makePage([{ id: 'p1' }])
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'fetch_social_feed') throw new Error('error sending request for url (https://dapi.sansbank.dev/v1/dapi)')
            if (cmd === 'fetch_social_feed_prefetched') return fallbackPage as any
            throw new Error('unexpected command ' + cmd)
        })
        const query = mockSdk((args) => {
            if (args.documentTypeName === 'post') return new Map([['p1', postDoc('p1', 'u1')]])
            return new Map()
        })

        const res = await fetchSocialFeedWithFallback('testnet', 20, null)

        expect(res).toBe(fallbackPage)
        // Timeline query = languageTimeline index shape (yappr parity).
        const timeline = query.mock.calls.find(([a]) => a.documentTypeName === 'post')?.[0]
        expect(timeline.where).toEqual([["language", "==", "en"], ["$createdAt", ">", 0]])
        expect(timeline.orderBy).toEqual([["language", "asc"], ["$createdAt", "desc"]])
        expect(timeline.limit).toBe(40)
        // Bundle handed to the Rust pipeline covers both post contracts.
        const prefetched = vi.mocked(invoke).mock.calls.find(([c]) => c === 'fetch_social_feed_prefetched')?.[1] as any
        expect(prefetched.network).toBe('testnet')
        expect(prefetched.ownerId).toBeNull()
        expect(Object.keys(prefetched.bundle.documents)).toEqual(
            expect.arrayContaining(['evo_test:post', 'yappr_test:post'])
        )
        expect(prefetched.bundle.documents['yappr_test:post'][0].$id).toBe('p1')
    })

    it('rethrows the ORIGINAL error when the fallback also fails', async () => {
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'fetch_social_feed') throw new Error('proxy unreachable')
            throw new Error('sdk transport failed too')
        })
        mockSdk()

        await expect(fetchSocialFeedWithFallback('testnet', 20, null))
            .rejects.toThrow('proxy unreachable')
    })

    it('threads ownerId through the fallback with the ownerAndTime query shape', async () => {
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'fetch_social_feed') throw new Error('down')
            return makePage() as any
        })
        const query = mockSdk()

        await fetchSocialFeedWithFallback('testnet', 50, 'owner1')

        const timeline = query.mock.calls.find(([a]) => a.documentTypeName === 'post')?.[0]
        expect(timeline.where).toEqual([["$ownerId", "==", "owner1"], ["$createdAt", ">", 0]])
        expect(timeline.orderBy).toEqual([["$ownerId", "asc"], ["$createdAt", "desc"]])
        const prefetched = vi.mocked(invoke).mock.calls.find(([c]) => c === 'fetch_social_feed_prefetched')?.[1] as any
        expect(prefetched.ownerId).toBe('owner1')
    })

    it('prefetches reply/quote parents into the same contract bucket', async () => {
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'fetch_social_feed') throw new Error('down')
            return makePage() as any
        })
        const query = mockSdk((args) => {
            const w = JSON.stringify(args.where)
            if (args.documentTypeName === 'post' && w.includes('"$id"')) {
                return new Map([['parent1', postDoc('parent1', 'u2')]])
            }
            if (args.documentTypeName === 'post') {
                return new Map([['child1', postDoc('child1', 'u1', { replyToPostId: 'parent1' })]])
            }
            return new Map()
        })

        await fetchSocialFeedViaSdk('testnet', 20)

        const parentQueries = query.mock.calls.filter(([a]) =>
            a.documentTypeName === 'post' && JSON.stringify(a.where).includes('"$id"'))
        expect(parentQueries.length).toBeGreaterThan(0)
        expect(parentQueries[0]?.[0].where).toEqual([["$id", "in", ["parent1"]]])
        const prefetched = vi.mocked(invoke).mock.calls.find(([c]) => c === 'fetch_social_feed_prefetched')?.[1] as any
        const ids = prefetched.bundle.documents['yappr_test:post'].map((d: any) => d.$id)
        expect(ids).toEqual(expect.arrayContaining(['child1', 'parent1']))
    })

    it('tolerates author-tier failures (bundle omits the tier; resolver degrades)', async () => {
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'fetch_social_feed') throw new Error('down')
            return makePage() as any
        })
        mockSdk((args) => {
            if (args.documentTypeName === 'post') return new Map([['p1', postDoc('p1', 'u1')]])
            throw new Error('tier down') // profiles/domains unavailable
        })

        const res = await fetchSocialFeedViaSdk('testnet', 20)

        expect(res).toBeDefined()
        const prefetched = vi.mocked(invoke).mock.calls.find(([c]) => c === 'fetch_social_feed_prefetched')?.[1] as any
        expect(prefetched.bundle.documents['profile_test:profile']).toBeUndefined()
        expect(prefetched.bundle.documents['dpns_test:domain']).toBeUndefined()
        expect(prefetched.bundle.documents['dashpay_test:profile']).toBeUndefined()
    })

    it('serializes SDK Document instances via toJSON', async () => {
        vi.mocked(invoke).mockImplementation(async (cmd: string) => {
            if (cmd === 'fetch_social_feed') throw new Error('down')
            return makePage() as any
        })
        mockSdk((args) => {
            if (args.documentTypeName === 'post') {
                return new Map([['p1', { toJSON: () => postDoc('p1', 'u1') }]])
            }
            return new Map()
        })

        await fetchSocialFeedViaSdk('testnet', 20)

        const prefetched = vi.mocked(invoke).mock.calls.find(([c]) => c === 'fetch_social_feed_prefetched')?.[1] as any
        expect(prefetched.bundle.documents['yappr_test:post'][0]).toEqual(
            expect.objectContaining({ $id: 'p1', $ownerId: 'u1' })
        )
    })
})
