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

describe('fetch.ts Store Actions', () => {
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
            debug: {},
            fetchPosts: fetchPostsAction
        }
    })

    describe('fetchPostsAction', () => {
        it('should handle critical failures in profile fetching', async () => {
            vi.mocked(api.fetchPostsFromTauri).mockResolvedValue([
                { ownerId: 'u1', createdAt: 100 } as any
            ])
            vi.mocked(api.fetchUserProfile).mockRejectedValue(new Error('DAPI Connection Failed'))

            await fetchPostsAction.call(mockStore)

            expect(mockStore.error).toBe('DAPI Connection Failed')
            expect(mockStore.isLoading).toBe(false)
        })

        it('should remain successful if only one contract fails (resilience)', async () => {
            vi.mocked(api.fetchPostsFromTauri).mockRejectedValue(new Error('Minor Error'))

            await fetchPostsAction.call(mockStore)

            expect(mockStore.error).toBeNull()
            expect(mockStore.debug.fetchCounts['contract_1']).toBe(0)
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
