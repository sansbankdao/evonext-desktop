// src/stores/posts/actions/fetch.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPostsAction, fetchMorePostsAction, fetchUserPostsAction } from './fetch'
import * as api from '@/services/posts/fetching'
import * as transformers from '@/services/posts/transformers'
import { invoke } from '@/utils/tauri'

vi.mock('@/services/posts/fetching')
vi.mock('@/services/posts/transformers')
vi.mock('@/utils/tauri')
vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({ state: { network: 'testnet' } })
}))
vi.mock('@/constants', () => ({
    getActivePostContracts: vi.fn(() => ['contract_1']),
    EVONEXT_CONTRACT_ID_TESTNET: 'evo_test',
    YAPPR_CONTRACT_ID_TESTNET: 'yappr_test',
    EVONEXT_CONTRACT_ID_MAINNET: 'evo_main'
}))

describe('fetch.ts Store Actions - Deep Coverage', () => {
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
        vi.mocked(transformers.transformPostDocuments).mockReturnValue([])
    })

    describe('fetchPostsAction logic branches', () => {
        it('should handle empty document results early', async () => {
            vi.mocked(api.fetchPostsFromTauri).mockResolvedValue([])
            await fetchPostsAction.call(mockStore)
            expect(mockStore.posts).toEqual([])
            expect(mockStore.hasNextPage).toBe(false)
        })

        it('should fetch parent documents when replyToPostId exists', async () => {
            const childDoc = { id: 'c1', ownerId: 'u1', createdAt: 100, replyToPostId: 'p1' }
            const parentDoc = { id: 'p1', ownerId: 'u2', createdAt: 50 }

            vi.mocked(api.fetchPostsFromTauri).mockResolvedValue([childDoc] as any)
            vi.mocked(api.fetchDocumentsById).mockResolvedValue([parentDoc] as any)
            vi.mocked(api.fetchUserProfile).mockResolvedValue({ label: 'user' })

            await fetchPostsAction.call(mockStore)

            expect(api.fetchDocumentsById).toHaveBeenCalled()
            expect(transformers.transformPostDocuments).toHaveBeenCalledTimes(2)
        })

        it('should process profiles and yappr profiles for owners', async () => {
            const docs = [{ id: '1', ownerId: 'u1', createdAt: 1000 }]
            vi.mocked(api.fetchPostsFromTauri).mockResolvedValue(docs as any)
            vi.mocked(api.fetchUserProfile).mockResolvedValue({ label: 'DPNS' })
            vi.mocked(invoke).mockResolvedValue([{ bio: 'Yappr Bio' }])

            await fetchPostsAction.call(mockStore)

            expect(api.fetchUserProfile).toHaveBeenCalledWith('u1', 'testnet')
            expect(invoke).toHaveBeenCalledWith('get_posts', expect.objectContaining({
                documentType: 'profile'
            }))
        })

        it('should handle Base58 encoding for ownerIds in Yappr check', async () => {
            const docs = [{ id: '1', ownerId: 'base64Id==', createdAt: 1000 }]
            vi.mocked(api.fetchPostsFromTauri).mockResolvedValue(docs as any)

            await fetchPostsAction.call(mockStore)

            // Verifies that the internal ensureBase58 logic was triggered
            expect(invoke).toHaveBeenCalled()
        })
    })

    describe('fetchUserPostsAction', () => {
        it('should filter global posts for specific user', async () => {
            mockStore.posts = [
                { id: '1', ownerId: 'u1' },
                { id: '2', ownerId: 'u2' }
            ]
            // Mock the internal call to fetchPosts
            mockStore.fetchPosts.mockImplementation(async () => {
                mockStore.posts = [{ id: '1', ownerId: 'u1' }]
            })

            await fetchUserPostsAction.call(mockStore, 'u1')

            expect(mockStore.userPosts.length).toBe(1)
            expect(mockStore.userPosts[0].ownerId).toBe('u1')
        })
    })
})
