// src/stores/posts/actions/fetch.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPostsAction, fetchUserPostsAction } from './fetch'
import { invoke } from '@/utils/tauri'
import type { ISocialFeedPage, ISocialPost } from '@/types/social'

vi.mock('@/services/posts/fetching')
vi.mock('@/services/posts/transformers')
vi.mock('@/utils/tauri')
// fetch.ts pulls in the fallback service, which imports the evo-sdk
// transport — mock it so the primary-path tests never load the WASM.
vi.mock('@/services/platform', () => ({ connectEvoSdk: vi.fn() }))
vi.mock('@dashevo/evo-sdk', () => ({}))
vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({ state: { network: 'testnet' } })
}))
vi.mock('@/constants', () => ({
    getActivePostContracts: vi.fn(() => ['evo_test', 'yappr_test']),
    EVONEXT_CONTRACT_ID_TESTNET: 'evo_test',
    EVONEXT_CONTRACT_ID_MAINNET: 'evo_main'
}))

function makeSocialPost(overrides: Partial<ISocialPost> = {}): ISocialPost {
    return {
        id: 'p1',
        contractId: 'yappr_test',
        source: 'yappr',
        ownerId: 'u1',
        author: {
            identityId: 'u1',
            displayName: 'Alice',
            username: '@alice',
            verified: true,
            bio: 'bio',
            avatar: { kind: 'dicebear', style: 'bottts', seed: 's' }
        },
        content: 'gm **Dash**',
        contentParts: [
            { type: 'text', value: 'gm ', children: null },
            { type: 'bold', value: 'Dash', children: [{ type: 'text', value: 'Dash', children: null }] }
        ],
        createdAt: 2000,
        updatedAt: 2000,
        replyToPostId: null,
        quotedPostId: null,
        replyTo: null,
        quotedPost: null,
        language: 'en',
        sensitive: false,
        mediaUrls: [],
        ...overrides
    }
}

function makePage(posts: ISocialPost[], fetchedCounts: Record<string, number>, duplicateCount = 0): ISocialFeedPage {
    return { posts, nextCursor: null, fetchedCounts, duplicateCount }
}

describe('fetch.ts Store Actions — Rust feed command', () => {
    let mockStore: any
    beforeEach(() => {
        vi.clearAllMocks()
        mockStore = {
            posts: [],
            userPosts: [],
            isLoading: false,
            error: null,
            limit: 5,
            hasNextPage: false,
            lastFetched: null,
            debug: { fetchCounts: {} },
            fetchPosts: vi.fn()
        }
    })

    it('invokes fetch_social_feed with network, limit and ownerId', async () => {
        vi.mocked(invoke).mockResolvedValue(makePage([], { evo_test: 0, yappr_test: 0 }))
        await fetchPostsAction.call(mockStore, { ownerId: 'u9' })
        expect(invoke).toHaveBeenCalledWith('fetch_social_feed', {
            network: 'testnet',
            limit: 5,
            ownerId: 'u9'
        })
    })

    it('maps social posts onto the legacy IPost shape', async () => {
        const parent = makeSocialPost({
            id: 'parent1', ownerId: 'u2', content: 'parent', contentParts: [],
            author: {
                identityId: 'u2', displayName: 'Bob', username: '@bob', verified: false,
                bio: '', avatar: { kind: 'uri', uri: 'https://x.io/p.png' }
            }
        })
        const child = makeSocialPost({ replyToPostId: 'parent1', replyTo: parent })
        vi.mocked(invoke).mockResolvedValue(
            makePage([child], { evo_test: 3, yappr_test: 4 }, 1)
        )

        await fetchPostsAction.call(mockStore)

        const post = mockStore.posts[0]
        expect(post.id).toBe('p1')
        expect(post.contractId).toBe('yappr_test')
        expect(post.source).toBe('yappr')
        expect(post.author.displayName).toBe('Alice')
        expect(post.author.verified).toBe(true)
        // DiceBear avatars are LOCAL data URIs (no api.dicebear.com leak)
        expect(post.author.avatar).toMatch(/^data:image\/svg\+xml/)
        expect(post.author.avatar).not.toContain('api.dicebear.com')
        expect(post.author.avatarSvg).toContain('<svg')
        // URI avatars pass straight through
        expect(post.replyTo.author.avatar).toBe('https://x.io/p.png')
        expect(post.replyTo.author.avatarUrl).toBe('https://x.io/p.png')
        // Rich content segments carried through for ContentRenderer
        expect(post.contentParts).toHaveLength(2)
        expect(post.contentParts[1].type).toBe('bold')
        // Parent embedded
        expect(post.replyToPostId).toBe('parent1')
        expect(post.replyTo.id).toBe('parent1')
    })

    it('populates the debug panel from the page metadata', async () => {
        vi.mocked(invoke).mockResolvedValue(
            makePage([makeSocialPost()], { evo_test: 3, yappr_test: 4 }, 2)
        )
        await fetchPostsAction.call(mockStore)
        expect(mockStore.debug.activeContracts).toEqual(['evo_test', 'yappr_test'])
        expect(mockStore.debug.fetchCounts).toEqual({ evo_test: 3, yappr_test: 4 })
        expect(mockStore.debug.mergeCount).toBe(1)
        expect(mockStore.debug.duplicateCount).toBe(2)
        expect(mockStore.debug.lastFetchTime).toBeDefined()
    })

    it('handles an empty page', async () => {
        vi.mocked(invoke).mockResolvedValue(makePage([], { evo_test: 0 }))
        await fetchPostsAction.call(mockStore)
        expect(mockStore.posts).toEqual([])
        expect(mockStore.hasNextPage).toBe(false)
        expect(mockStore.isLoading).toBe(false)
    })

    it('sets hasNextPage when more unique documents were fetched than the limit', async () => {
        // 7 fetched − 1 duplicate = 6 unique > limit 5
        vi.mocked(invoke).mockResolvedValue(
            makePage([makeSocialPost()], { evo_test: 3, yappr_test: 4 }, 1)
        )
        await fetchPostsAction.call(mockStore)
        expect(mockStore.hasNextPage).toBe(true)
    })

    it('surfaces command failures on the store error field', async () => {
        vi.mocked(invoke).mockRejectedValue(new Error('dapi down'))
        await fetchPostsAction.call(mockStore)
        expect(mockStore.error).toBe('dapi down')
        expect(mockStore.isLoading).toBe(false)
    })

    describe('fetchUserPostsAction', () => {
        it('should filter global posts for specific user', async () => {
            mockStore.posts = [
                { id: '1', ownerId: 'u1' },
                { id: '2', ownerId: 'u2' }
            ]
            mockStore.fetchPosts.mockImplementation(async () => {
                mockStore.posts = [{ id: '1', ownerId: 'u1' }]
            })
            await fetchUserPostsAction.call(mockStore, 'u1')
            expect(mockStore.userPosts.length).toBe(1)
            expect(mockStore.userPosts[0].ownerId).toBe('u1')
        })
    })
})
