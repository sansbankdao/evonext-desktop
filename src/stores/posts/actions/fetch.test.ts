// src/stores/posts/actions/fetch.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchPostsAction, fetchMorePostsAction } from './fetch'
import * as api from '@/services/posts/fetching'
import * as transformers from '@/services/posts/transformers'

vi.mock('@/services/posts/fetching')
vi.mock('@/services/posts/transformers')
vi.mock('@/utils/tauri')
vi.mock('@/stores/settings', () => ({
    useSettingsStore: () => ({ state: { network: 'testnet' } })
}))
vi.mock('@/constants', () => ({
    getActivePostContracts: () => ['contract_1'],
    EVONEXT_CONTRACT_ID_TESTNET: 'evo_test',
    YAPPR_CONTRACT_ID_TESTNET: 'yappr_test',
    EVONEXT_CONTRACT_ID_MAINNET: 'evo_main'
}))

describe('fetch.ts Store Actions - Final Consolidated', () => {
    let mockStore: any

    beforeEach(() => {
        vi.clearAllMocks()
        mockStore = {
            posts: [],
            isLoading: false,
            error: null,
            limit: 5,
            hasNextPage: false,
            lastFetched: null,
            debug: { fetchCounts: {} },
            fetchPosts: fetchPostsAction
        }
        vi.mocked(transformers.transformPostDocuments).mockReturnValue([])
    })

    describe('fetchPostsAction', () => {
        it('should catch and store errors from non-resilient API calls', async () => {
            // 1. Return a document so the logic proceeds to profile fetching
            vi.mocked(api.fetchPostsFromTauri).mockResolvedValue([
                { id: '1', ownerId: 'u1', createdAt: 1000 } as any
            ])

            // 2. Fail the user profile fetch (which is NOT swallowed by the inner resilient loop)
            vi.mocked(api.fetchUserProfile).mockRejectedValue(new Error('DAPI Down'))

            await fetchPostsAction.call(mockStore)

            expect(mockStore.error).toBe('DAPI Down')
            expect(mockStore.isLoading).toBe(false)
        })

        it('should remain successful if only one contract fails (resilience check)', async () => {
            // This error is caught inside the loop and does not reach the outer catch
            vi.mocked(api.fetchPostsFromTauri).mockRejectedValue(new Error('Minor Error'))

            await fetchPostsAction.call(mockStore)

            expect(mockStore.error).toBeNull()
            expect(mockStore.debug.fetchCounts['contract_1']).toBe(0)
        })

        it('should deduplicate documents with same owner and timestamp', async () => {
            const duplicateDocs = [
                { id: '1', ownerId: 'u1', createdAt: 1000 },
                { id: '2', ownerId: 'u1', createdAt: 1000 }
            ]
            vi.mocked(api.fetchPostsFromTauri).mockResolvedValue(duplicateDocs as any)

            await fetchPostsAction.call(mockStore)

            expect(mockStore.debug.duplicateCount).toBe(1)
        })
    })

    describe('fetchMorePostsAction', () => {
        it('should set error state if fetch fails', async () => {
            mockStore.hasNextPage = true
            vi.mocked(api.fetchPostsFromTauri).mockRejectedValue(new Error('Network Timeout'))

            await fetchMorePostsAction.call(mockStore)

            expect(mockStore.error).toBe('Network Timeout')
        })
    })
})
